import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { EmployeesModel } from '../models/employee.model.js';

// Assina o token com os dados do funcionário
export const signToken = (employee) => jwt.sign(
  {
    sub: employee._id.toString(),
    company: employee.company.toString(),
    role: employee.role,
    employeeId: employee.employeeId,
    name: employee.name,
    email: employee.email,
  },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
);

// Lê o token do header Authorization e monta o ctx.user (ou null)
export const buildContext = async ({ req }) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { user: null };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Confirma que o funcionário ainda existe (pode ter sido removido)
    const employee = await EmployeesModel.findOne({
      _id: payload.sub,
      company: payload.company,
      isRegistered: true,
    });
    if (!employee) {
      return { user: null };
    }

    return {
      user: {
        id: employee._id.toString(),
        company: employee.company.toString(),
        role: employee.role,
        employeeId: employee.employeeId,
      },
    };
  } catch {
    return { user: null };
  }
};

// Erro padrão com código nas extensions
export const appError = (message, code) => new GraphQLError(message, {
  extensions: { code },
});

// Exige um usuário logado
export const requireAuth = (ctx) => {
  if (!ctx.user) {
    throw appError('Você precisa estar logado!', 'UNAUTHENTICATED');
  }
  return ctx.user;
};

// Exige um usuário logado com papel de líder
export const requireLeader = (ctx) => {
  const user = requireAuth(ctx);
  if (user.role !== 'leader') {
    throw appError('Apenas o líder pode realizar esta ação!', 'FORBIDDEN');
  }
  return user;
};
