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

  // Espera os índices únicos serem criados antes de atender requisições
  try {
    await Promise.all(mongoose.modelNames().map((modelName) => mongoose.model(modelName).init()));
  } catch (error) {
    // Dados antigos duplicados podem impedir a criação de um índice único
    console.error('Erro ao criar os índices do banco de dados:', error.message);
  }
};
