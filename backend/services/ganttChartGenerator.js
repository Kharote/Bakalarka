import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GanttChartGenerator {
  constructor() {
    this.colors = {
      Planning: '#3b82f6',
      Development: '#10b981',
      Testing: '#f59e0b',
      Deployment: '#8b5cf6',
      background: '#ffffff',
      gridLine: '#e5e7eb',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      milestone: '#dc2626'
    };
    
    this.config = {
      width: 1400,
      headerHeight: 80,
      rowHeight: 40,
      leftPanelWidth: 250,
      dayWidth: 20,
      padding: 20,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif'
    };
  }

  /**
   * Generate a Gantt chart SVG from JSON data
   * @param {Object} ganttData - The Gantt chart JSON data
   * @param {string} outputPath - Path to save the generated image
   * @returns {Promise<string>} - Path to the generated image
   */
  async generateChart(ganttData, outputPath) {
    try {
      console.log('Starting Gantt chart generation...');
      console.log('Output path:', outputPath);
      
      const { projectName, startDate, endDate, tasks, milestones = [] } = ganttData;
      
      if (!projectName || !startDate || !endDate || !tasks) {
        throw new Error('Missing required Gantt chart data: projectName, startDate, endDate, or tasks');
      }
      
      // Calculate dimensions
      const projectStart = new Date(startDate);

      // Use the actual last task/milestone end date so the chart isn't padded
      // with empty space beyond the last activity
      const taskEndDates = tasks.map(t => new Date(t.endDate)).filter(d => !isNaN(d));
      const milestoneEndDates = milestones.map(m => new Date(m.date)).filter(d => !isNaN(d));
      const allEndDates = [...taskEndDates, ...milestoneEndDates];
      const lastActivityDate = allEndDates.length > 0
        ? new Date(Math.max(...allEndDates.map(d => d.getTime())))
        : new Date(endDate);
      // Add a small tail buffer (7 days) so the last bar isn't cut off at the edge
      const chartEnd = new Date(lastActivityDate);
      chartEnd.setDate(chartEnd.getDate() + 7);

      const totalDays = this.calculateDaysDifference(projectStart, chartEnd);

      console.log('Project duration:', totalDays, 'days (trimmed to last activity + 7d buffer)');
      console.log('Number of tasks:', tasks.length);
      
      // Dynamic dayWidth: fit the timeline into a max ~1800px usable area
      const MAX_CHART_WIDTH = 1800;
      const usableWidth = MAX_CHART_WIDTH - this.config.leftPanelWidth - this.config.padding * 2;
      this.config.dayWidth = Math.min(20, Math.max(3, Math.floor(usableWidth / Math.max(totalDays, 1))));

      // Timeline marker step: weekly if wide enough, biweekly/monthly otherwise
      if (this.config.dayWidth >= 10) {
        this.config.timelineStep = 7;
      } else if (this.config.dayWidth >= 5) {
        this.config.timelineStep = 14;
      } else {
        this.config.timelineStep = 30;
      }

      const chartWidth = this.config.leftPanelWidth + (totalDays * this.config.dayWidth) + this.config.padding * 2;
      
      const chartHeight = 
        this.config.headerHeight + 
        (tasks.length * this.config.rowHeight) + 
        this.config.padding * 2;

      console.log('Chart dimensions:', chartWidth, 'x', chartHeight, '| dayWidth:', this.config.dayWidth);

      // Generate SVG markup
      const svgContent = this.generateSVG(
        ganttData, 
        chartWidth, 
        chartHeight, 
        projectStart, 
        totalDays
      );

      console.log('SVG generated, length:', svgContent.length);

      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath));
      
      // Convert SVG to PNG using Sharp (flatten onto white to remove transparency)
      console.log('Converting SVG to PNG with Sharp...');
      const pngBuffer = await sharp(Buffer.from(svgContent))
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();
      
      console.log('PNG buffer size:', pngBuffer.length, 'bytes');
      
      await fs.writeFile(outputPath, pngBuffer);

      console.log('Gantt chart saved successfully:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('[ERROR] Error generating Gantt chart:', error);
      console.error('Stack trace:', error.stack);
      throw new Error(`Failed to generate Gantt chart: ${error.message}`);
    }
  }

  /**
   * Generate SVG markup for the Gantt chart
   */
  generateSVG(ganttData, chartWidth, chartHeight, projectStart, totalDays) {
    const { projectName, startDate, endDate, tasks, milestones = [] } = ganttData;
    const projectEnd = new Date(endDate);
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chartWidth}" height="${chartHeight}">`;
    
    // Background
    svg += `<rect width="${chartWidth}" height="${chartHeight}" fill="${this.colors.background}"/>`;
    
    // Draw header
    svg += this.drawHeaderSVG(projectName, projectStart, projectEnd, totalDays);
    
    // Draw timeline
    svg += this.drawTimelineHeaderSVG(projectStart, totalDays);
    
    // Draw grid
    svg += this.drawGridSVG(tasks.length, totalDays);
    
    // Draw tasks
    svg += this.drawTasksSVG(tasks, projectStart);
    
    // Draw milestones
    if (milestones.length > 0) {
      svg += this.drawMilestonesSVG(milestones, projectStart, tasks.length);
    }
    
    svg += '</svg>';
    return svg;
  }

  /**
   * Draw header in SVG
   */
  drawHeaderSVG(projectName, startDate, endDate, totalDays) {
    const y = this.config.padding;
    let svg = '';
    
    // Project name
    svg += `<text x="${this.config.padding}" y="${y + 20}" 
            font-size="${this.config.fontSize + 6}" 
            font-family="${this.config.fontFamily}" 
            font-weight="bold" 
            fill="${this.colors.textPrimary}">${this.escapeXml(projectName)}</text>`;
    
    // Project duration
    const durationText = `${this.formatDate(startDate)} - ${this.formatDate(endDate)} (${totalDays} days)`;
    svg += `<text x="${this.config.padding}" y="${y + 40}" 
            font-size="${this.config.fontSize}" 
            font-family="${this.config.fontFamily}" 
            fill="${this.colors.textSecondary}">${this.escapeXml(durationText)}</text>`;
    
    return svg;
  }

  /**
   * Draw timeline header in SVG
   */
  drawTimelineHeaderSVG(startDate, totalDays) {
    const y = this.config.headerHeight;
    const x = this.config.leftPanelWidth;
    const step = this.config.timelineStep || 7;
    let svg = '';
    
    // Draw date markers at the configured step interval
    for (let day = 0; day <= totalDays; day += step) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      const xPos = x + (day * this.config.dayWidth);
      
      // Vertical line
      svg += `<line x1="${xPos}" y1="${y}" x2="${xPos}" y2="${y + 20}" 
              stroke="${this.colors.gridLine}" stroke-width="1"/>`;
      
      // Date text (rotated)
      svg += `<text x="${xPos}" y="${y + 15}" 
              transform="rotate(-45 ${xPos} ${y + 15})" 
              font-size="${this.config.fontSize - 1}" 
              font-family="${this.config.fontFamily}" 
              fill="${this.colors.textSecondary}">${this.formatDate(date)}</text>`;
    }
    
    return svg;
  }

  /**
   * Draw grid in SVG
   */
  drawGridSVG(taskCount, totalDays) {
    const startY = this.config.headerHeight + this.config.padding;
    const startX = this.config.leftPanelWidth;
    const step = this.config.timelineStep || 7;
    let svg = '';
    
    // Horizontal lines
    for (let i = 0; i <= taskCount; i++) {
      const y = startY + (i * this.config.rowHeight);
      svg += `<line x1="${startX}" y1="${y}" 
              x2="${startX + (totalDays * this.config.dayWidth)}" y2="${y}" 
              stroke="${this.colors.gridLine}" stroke-width="0.5"/>`;
    }
    
    // Vertical lines at the configured step interval
    for (let day = 0; day <= totalDays; day += step) {
      const x = startX + (day * this.config.dayWidth);
      svg += `<line x1="${x}" y1="${startY}" 
              x2="${x}" y2="${startY + (taskCount * this.config.rowHeight)}" 
              stroke="${this.colors.gridLine}" stroke-width="0.5"/>`;
    }
    
    return svg;
  }

  /**
   * Draw tasks in SVG
   */
  drawTasksSVG(tasks, projectStart) {
    const startY = this.config.headerHeight + this.config.padding;
    const startX = this.config.leftPanelWidth;
    let svg = '';
    
    tasks.forEach((task, index) => {
      const y = startY + (index * this.config.rowHeight);
      
      // Task label
      const taskLabel = this.truncateText(task.name, this.config.leftPanelWidth - 20);
      svg += `<text x="${this.config.padding}" y="${y + (this.config.rowHeight / 2) + 5}" 
              font-size="${this.config.fontSize}" 
              font-family="${this.config.fontFamily}" 
              fill="${this.colors.textPrimary}">${this.escapeXml(taskLabel)}</text>`;
      
      // Assignee
      svg += `<text x="${this.config.padding}" y="${y + (this.config.rowHeight / 2) + 20}" 
              font-size="${this.config.fontSize - 2}" 
              font-family="${this.config.fontFamily}" 
              fill="${this.colors.textSecondary}">${this.escapeXml(task.assignee)}</text>`;
      
      // Task bar
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      const startDayOffset = this.calculateDaysDifference(projectStart, taskStart);
      const duration = this.calculateDaysDifference(taskStart, taskEnd);
      
      const barX = startX + (startDayOffset * this.config.dayWidth);
      const barWidth = duration * this.config.dayWidth;
      const barY = y + 8;
      const barHeight = this.config.rowHeight - 16;
      
      const color = this.colors[task.phase] || this.colors.Development;
      const darkerColor = this.darkenColor(color, 20);
      
      // Task bar background
      svg += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" 
              fill="${color}" stroke="${darkerColor}" stroke-width="1"/>`;
      
      // Progress indicator
      if (task.progress > 0) {
        const progressWidth = (barWidth * task.progress) / 100;
        const progressColor = this.darkenColor(color, 30);
        svg += `<rect x="${barX}" y="${barY}" width="${progressWidth}" height="${barHeight}" 
                fill="${progressColor}"/>`;
      }
      
      // Duration text - show days and hours if available
      const hours = task.estimatedHours || (duration * 8);
      const durationText = hours && hours !== duration * 8 ? `${duration}d (${hours}h)` : `${duration}d`;
      svg += `<text x="${barX + (barWidth / 2)}" y="${barY + (barHeight / 2) + 4}" 
              font-size="${this.config.fontSize - 2}" 
              font-family="${this.config.fontFamily}" 
              font-weight="bold" 
              fill="#ffffff" 
              text-anchor="middle">${durationText}</text>`;
    });
    
    return svg;
  }

  /**
   * Draw milestones in SVG
   */
  drawMilestonesSVG(milestones, projectStart, taskCount) {
    const startY = this.config.headerHeight + this.config.padding;
    const startX = this.config.leftPanelWidth;
    const bottomY = startY + (taskCount * this.config.rowHeight);
    let svg = '';
    
    milestones.forEach(milestone => {
      const milestoneDate = new Date(milestone.date);
      const dayOffset = this.calculateDaysDifference(projectStart, milestoneDate);
      const x = startX + (dayOffset * this.config.dayWidth);
      
      // Diamond shape
      svg += `<polygon points="${x},${startY - 10} ${x + 6},${startY} ${x},${startY + 10} ${x - 6},${startY}" 
              fill="${this.colors.milestone}"/>`;
      
      // Vertical dashed line
      svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${bottomY}" 
              stroke="${this.colors.milestone}" stroke-width="1" stroke-dasharray="5,5"/>`;
      
      // Milestone label (rotated)
      svg += `<text x="${x}" y="${startY - 15}" 
              transform="rotate(-45 ${x} ${startY - 15})" 
              font-size="${this.config.fontSize - 1}" 
              font-family="${this.config.fontFamily}" 
              font-weight="bold" 
              fill="${this.colors.milestone}">${this.escapeXml(milestone.name)}</text>`;
    });
    
    return svg;
  }

  /**
   * Draw the chart header with project information
   */
  drawHeader(ctx, projectName, startDate, endDate, totalDays, chartWidth) {
    const y = this.config.padding;
    
    // Project name
    ctx.fillStyle = this.colors.textPrimary;
    ctx.font = `bold ${this.config.fontSize + 6}px ${this.config.fontFamily}`;
    ctx.fillText(projectName, this.config.padding, y + 20);

    // Project duration
    ctx.fillStyle = this.colors.textSecondary;
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    const durationText = `${this.formatDate(startDate)} - ${this.formatDate(endDate)} (${totalDays} days)`;
    ctx.fillText(durationText, this.config.padding, y + 40);
  }

  /**
   * Draw the timeline header with date markers
   */
  drawTimelineHeader(ctx, startDate, totalDays) {
    const y = this.config.headerHeight;
    const x = this.config.leftPanelWidth;

    ctx.fillStyle = this.colors.textSecondary;
    ctx.font = `${this.config.fontSize - 1}px ${this.config.fontFamily}`;

    // Draw date markers every 7 days (weekly)
    for (let day = 0; day <= totalDays; day += 7) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      const xPos = x + (day * this.config.dayWidth);
      
      // Draw vertical line
      ctx.strokeStyle = this.colors.gridLine;
      ctx.beginPath();
      ctx.moveTo(xPos, y);
      ctx.lineTo(xPos, y + 20);
      ctx.stroke();

      // Draw date text
      ctx.save();
      ctx.translate(xPos, y + 15);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(this.formatDate(date), 0, 0);
      ctx.restore();
    }
  }

  /**
   * Draw the background grid
   */
  drawGrid(ctx, taskCount, totalDays) {
    const startY = this.config.headerHeight + this.config.padding;
    const startX = this.config.leftPanelWidth;

    ctx.strokeStyle = this.colors.gridLine;
    ctx.lineWidth = 0.5;

    // Draw horizontal lines
    for (let i = 0; i <= taskCount; i++) {
      const y = startY + (i * this.config.rowHeight);
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + (totalDays * this.config.dayWidth), y);
      ctx.stroke();
    }

    // Draw vertical lines (every 7 days)
    for (let day = 0; day <= totalDays; day += 7) {
      const x = startX + (day * this.config.dayWidth);
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + (taskCount * this.config.rowHeight));
      ctx.stroke();
    }
  }

  /**
   * Draw all tasks as bars
   */
  drawTasks(ctx, tasks, projectStart) {
    const startY = this.config.headerHeight + this.config.padding;
    const startX = this.config.leftPanelWidth;

    tasks.forEach((task, index) => {
      const y = startY + (index * this.config.rowHeight);
      
      // Draw task label (left panel)
      ctx.fillStyle = this.colors.textPrimary;
      ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
      ctx.fillText(
        this.truncateText(ctx, task.name, this.config.leftPanelWidth - 20),
        this.config.padding,
        y + (this.config.rowHeight / 2) + 5
      );

      // Draw assignee
      ctx.fillStyle = this.colors.textSecondary;
      ctx.font = `${this.config.fontSize - 2}px ${this.config.fontFamily}`;
      ctx.fillText(
        this.truncateText(ctx, task.assignee, this.config.leftPanelWidth - 20),
        this.config.padding,
        y + (this.config.rowHeight / 2) + 20
      );

      // Calculate task bar position
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      const startDayOffset = this.calculateDaysDifference(projectStart, taskStart);
      const duration = this.calculateDaysDifference(taskStart, taskEnd);

      const barX = startX + (startDayOffset * this.config.dayWidth);
      const barWidth = duration * this.config.dayWidth;
      const barY = y + 8;
      const barHeight = this.config.rowHeight - 16;

      // Draw task bar
      const color = this.colors[task.phase] || this.colors.Development;
      ctx.fillStyle = color;
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Draw task bar border
      ctx.strokeStyle = this.darkenColor(color, 20);
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // Draw progress indicator
      if (task.progress > 0) {
        const progressWidth = (barWidth * task.progress) / 100;
        ctx.fillStyle = this.darkenColor(color, 30);
        ctx.fillRect(barX, barY, progressWidth, barHeight);
      }

      // Draw task duration text - show days and hours if available
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${this.config.fontSize - 2}px ${this.config.fontFamily}`;
      const hours = task.estimatedHours || (duration * 8);
      const durationText = hours && hours !== duration * 8 ? `${duration}d (${hours}h)` : `${duration}d`;
      const textWidth = ctx.measureText(durationText).width;
      if (textWidth < barWidth - 10) {
        ctx.fillText(durationText, barX + (barWidth / 2) - (textWidth / 2), barY + (barHeight / 2) + 4);
      }
    });
  }

  /**
   * Draw milestone markers
   */
  drawMilestones(ctx, milestones, projectStart, taskCount) {
    const startY = this.config.headerHeight + this.config.padding;
    const startX = this.config.leftPanelWidth;
    const bottomY = startY + (taskCount * this.config.rowHeight);

    milestones.forEach(milestone => {
      const milestoneDate = new Date(milestone.date);
      const dayOffset = this.calculateDaysDifference(projectStart, milestoneDate);
      const x = startX + (dayOffset * this.config.dayWidth);

      // Draw diamond shape
      ctx.fillStyle = this.colors.milestone;
      ctx.beginPath();
      ctx.moveTo(x, startY - 10);
      ctx.lineTo(x + 6, startY);
      ctx.lineTo(x, startY + 10);
      ctx.lineTo(x - 6, startY);
      ctx.closePath();
      ctx.fill();

      // Draw vertical dashed line
      ctx.strokeStyle = this.colors.milestone;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, bottomY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw milestone label
      ctx.save();
      ctx.translate(x, startY - 15);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = this.colors.milestone;
      ctx.font = `bold ${this.config.fontSize - 1}px ${this.config.fontFamily}`;
      ctx.fillText(milestone.name, 0, 0);
      ctx.restore();
    });
  }

  /**
   * Helper methods
   */
  calculateDaysDifference(date1, date2) {
    const diff = Math.abs(date2 - date1);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  }

  truncateText(text, maxWidth) {
    // Simple truncation for SVG (approximate character count)
    const approxCharsPerPixel = 0.15;
    const maxChars = Math.floor(maxWidth * approxCharsPerPixel);
    
    if (text.length <= maxChars) {
      return text;
    }
    
    return text.slice(0, maxChars - 3) + '...';
  }

  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }
}

export default new GanttChartGenerator();
