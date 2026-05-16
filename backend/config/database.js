import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ai_project_management',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDatabase = async () => {
  try {
    console.log('Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
    
    console.log('Synchronizing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
    
  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
    console.error('Please make sure PostgreSQL is running');
    process.exit(1);
  }
};

export { sequelize };
export default connectDatabase;
