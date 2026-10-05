import mongoose from 'mongoose';
const { Schema } = mongoose;

export const TASK_STATUS = ['pendente', 'em_andamento', 'concluida'];

const taskSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'companies', required: true },
  taskId: { type: Number, required: true },
  taskName: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  status: { type: String, enum: TASK_STATUS, default: 'pendente' },
  // Projeto da tarefa (opcional)
  project: { type: Schema.Types.ObjectId, ref: 'projects', default: null },
  responsibles: [
    {
      _id: false,
      leadershipLevel: { type: Number, min: 1, max: 3, required: true },
      employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
    }
  ],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
});

// taskId é único dentro de cada empresa
taskSchema.index({ company: 1, taskId: 1 }, { unique: true });

export const TasksModel = mongoose.model('tasks', taskSchema);
