import mongoose from 'mongoose';

// Conecta ao banco de dados e encerra o processo se falhar
export const connectDB = async () => {
  if (!process.env.MONGO_DB) {
    console.error('Variável MONGO_DB não definida!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log('Banco de dados conectado');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error.message);
    process.exit(1);
  }
};
