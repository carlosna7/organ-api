import { CompaniesModel } from '../models/company.model.js';
import { EmployeesModel } from '../models/employee.model.js';
import { TasksModel, TASK_STATUS } from '../models/task.model.js';
import { signToken, appError, requireAuth, requireLeader } from '../auth/auth.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const saltRounds = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Converte datas para ISO 8601
const toISO = (date) => (date ? new Date(date).toISOString() : null);

// Verifica se um campo de texto foi preenchido e devolve sem espaços nas pontas
const requireText = (value, field) => {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) {
		throw appError(`O campo ${field} é obrigatório!`, 'BAD_USER_INPUT');
	}
	return text;
};

// Valida o formato do email e devolve normalizado
const validateEmail = (email) => {
	const normalized = requireText(email, 'email').toLowerCase();
	if (!EMAIL_REGEX.test(normalized)) {
		throw appError('Email inválido!', 'BAD_USER_INPUT');
	}
	return normalized;
};

// Valida o tamanho mínimo da senha
const validatePassword = (password) => {
	if (typeof password !== 'string' || password.length < 6) {
		throw appError('A senha deve ter no mínimo 6 caracteres!', 'BAD_USER_INPUT');
	}
	return password;
};

// Erro de chave duplicada do MongoDB
const isDuplicateKey = (error) => error?.code === 11000;

// Monta a resposta de autenticação
const authPayload = (employee) => ({
	token: signToken(employee),
	employee,
});

// Incrementa o contador da empresa de forma atômica e devolve o novo valor
const nextCounter = async (companyId, field) => {
	const company = await CompaniesModel.findByIdAndUpdate(
		companyId,
		{ $inc: { [`counters.${field}`]: 1 } },
		{ new: true }
	);
	if (!company) {
		throw appError('Empresa não encontrada!', 'NOT_FOUND');
	}
	return company.counters[field];
};

// Devolve o número reservado ao contador, mas só se ninguém reservou outro depois
// (assim nunca reaproveita um número que já pode ter sido entregue)
const releaseCounter = async (companyId, field, reserved) => {
	try {
		await CompaniesModel.updateOne(
			{ _id: companyId, [`counters.${field}`]: reserved },
			{ $inc: { [`counters.${field}`]: -1 } }
		);
	} catch {
		// Se não devolver, só fica um número sem uso
	}
};

// Executa as tarefas de uma mesma chave em fila, uma de cada vez (neste processo)
const queues = new Map();
const runInQueue = (key, task) => {
	const result = (queues.get(key) ?? Promise.resolve()).then(task);
	const tail = result.catch(() => {});
	queues.set(key, tail);
	tail.then(() => {
		if (queues.get(key) === tail) {
			queues.delete(key);
		}
	});
	return result;
};

// Busca uma tarefa da empresa do usuário
const findTask = async (companyId, taskId) => {
	const task = await TasksModel.findOne({ company: companyId, taskId });
	if (!task) {
		throw appError('Tarefa não encontrada!', 'NOT_FOUND');
	}
	return task;
};

// Valida os responsáveis e troca o employeeId pelo _id do funcionário
const buildResponsibles = async (companyId, responsibles) => {
	const employeeIds = responsibles.map((responsible) => responsible.employeeId);

	responsibles.forEach(({ leadershipLevel }) => {
		if (!Number.isInteger(leadershipLevel) || leadershipLevel < 1 || leadershipLevel > 3) {
			throw appError('O nível de liderança deve ser entre 1 e 3!', 'BAD_USER_INPUT');
		}
	});

	// Não deixa o mesmo funcionário aparecer duas vezes
	if (new Set(employeeIds).size !== employeeIds.length) {
		throw appError('Funcionário repetido na lista de responsáveis!', 'BAD_USER_INPUT');
	}

	// Os responsáveis precisam ser funcionários registrados da mesma empresa
	const employees = await EmployeesModel.find({
		company: companyId,
		employeeId: { $in: employeeIds },
		isRegistered: true,
	});
	if (employees.length !== employeeIds.length) {
		throw appError('Responsável não encontrado ou ainda não registrado!', 'BAD_USER_INPUT');
	}

	return responsibles.map(({ employeeId, leadershipLevel }) => ({
		leadershipLevel,
		employee: employees.find((employee) => employee.employeeId === employeeId)._id,
	}));
};

export const resolvers = {
	Query: {

		me: async (_, __, ctx) => {
			const user = requireAuth(ctx);
			const employee = await EmployeesModel.findById(user.id);
			if (!employee) {
				throw appError('Você precisa estar logado!', 'UNAUTHENTICATED');
			}
			return employee;
		},

		getCompany: async (_, __, ctx) => {
			const user = requireAuth(ctx);
			const company = await CompaniesModel.findById(user.company);
			if (!company) {
				throw appError('Empresa não encontrada!', 'NOT_FOUND');
			}
			return company;
		},

		// Registrados e convites pendentes
		getEmployees: async (_, __, ctx) => {
			const user = requireAuth(ctx);
			return EmployeesModel.find({ company: user.company }).sort({ employeeId: 1 });
		},

		getEmployeeById: async (_, { employeeId }, ctx) => {
			const user = requireAuth(ctx);
			return EmployeesModel.findOne({ company: user.company, employeeId });
		},

		// Lista vazia ou nula devolve todos os funcionários
		getSomeEmployeeById: async (_, { employeeIds }, ctx) => {
			const user = requireAuth(ctx);
			const filter = { company: user.company };
			if (employeeIds?.length) {
				filter.employeeId = { $in: employeeIds };
			}
			return EmployeesModel.find(filter).sort({ employeeId: 1 });
		},

		// Mais recentes primeiro
		getTasks: async (_, { status }, ctx) => {
			const user = requireAuth(ctx);
			const filter = { company: user.company };
			if (status) {
				filter.status = status;
			}
			return TasksModel.find(filter).sort({ createdAt: -1, taskId: -1 });
		},
	},
	Mutation: {

		createCompany: async (_, { name, employee }) => {
			// Valida os dados recebidos
			const companyName = requireText(name, 'nome da empresa');
			const employeeName = requireText(employee.name, 'nome');
			const position = requireText(employee.position, 'cargo');
			const email = validateEmail(employee.email);
			validatePassword(employee.password);

			// Verifica se o email já existe no banco de dados
			const existingEmail = await EmployeesModel.exists({ email });
			if (existingEmail) {
				throw appError('Email já está cadastrado!', 'CONFLICT');
			}
			// Verifica se já existe uma empresa com esse nome (ignora maiúsculas)
			const existingCompany = await CompaniesModel.findOne({ name: companyName })
				.collation({ locale: 'pt', strength: 2 });
			if (existingCompany) {
				throw appError('Empresa já cadastrada!', 'CONFLICT');
			}

			// Cadastra a nova empresa (o líder já usa o employeeId 1)
			// O índice único do nome barra cadastros simultâneos com o mesmo nome
			let newCompany;
			try {
				newCompany = await CompaniesModel.create({
					companyId: uuidv4(),
					name: companyName,
					counters: { employee: 1, task: 0 },
				});
			} catch (error) {
				if (isDuplicateKey(error)) {
					throw appError('Empresa já cadastrada!', 'CONFLICT');
				}
				throw error;
			}

			// Cria o líder da empresa; se falhar, apaga a empresa criada
			try {
				const leader = await EmployeesModel.create({
					employeeId: 1,
					name: employeeName,
					position,
					email,
					password: await bcrypt.hash(employee.password, saltRounds),
					role: 'leader',
					isRegistered: true,
					company: newCompany._id,
				});
				return authPayload(leader);
			} catch (error) {
				await CompaniesModel.deleteOne({ _id: newCompany._id });
				if (isDuplicateKey(error)) {
					throw appError('Email já está cadastrado!', 'CONFLICT');
				}
				throw error;
			}
		},

		newEmployee: async (_, { email }, ctx) => {
			const user = requireLeader(ctx);
			const normalizedEmail = validateEmail(email);

			// Convites da mesma empresa entram em fila: um email repetido não gasta número do contador
			return runInQueue(String(user.company), async () => {
				// Verifica se o email já existe no banco de dados
				const existingEmail = await EmployeesModel.exists({ email: normalizedEmail });
				if (existingEmail) {
					throw appError('Email já está cadastrado!', 'CONFLICT');
				}

				// Cria o convite já com o próximo employeeId da empresa
				const employeeId = await nextCounter(user.company, 'employee');
				try {
					return await EmployeesModel.create({
						employeeId,
						email: normalizedEmail,
						role: 'member',
						isRegistered: false,
						company: user.company,
					});
				} catch (error) {
					if (isDuplicateKey(error)) {
						// Email duplicado por outra empresa ou servidor: devolve o número reservado
						if (error.keyPattern?.email) {
							await releaseCounter(user.company, 'employee', employeeId);
						}
						throw appError('Email já está cadastrado!', 'CONFLICT');
					}
					throw error;
				}
			});
		},

		removeEmployee: async (_, { employeeId }, ctx) => {
			const user = requireLeader(ctx);

			// O líder não pode se remover
			if (employeeId === user.employeeId) {
				throw appError('Você não pode remover a si mesmo!', 'BAD_USER_INPUT');
			}

			const employee = await EmployeesModel.findOneAndDelete({ company: user.company, employeeId });
			if (!employee) {
				throw appError('Funcionário não encontrado!', 'NOT_FOUND');
			}

			// Tira o funcionário dos responsáveis das tarefas
			await TasksModel.updateMany(
				{ company: user.company },
				{ $pull: { responsibles: { employee: employee._id } } }
			);

			return true;
		},

		register: async (_, { name, position, email, password }) => {
			// Valida os dados recebidos
			const employeeName = requireText(name, 'nome');
			const employeePosition = requireText(position, 'cargo');
			const normalizedEmail = validateEmail(email);
			validatePassword(password);

			// Verifica se o email foi convidado por alguma empresa
			const invite = await EmployeesModel.findOne({ email: normalizedEmail });
			if (!invite) {
				throw appError('Email não convidado por nenhuma empresa!', 'NOT_FOUND');
			}
			// Verifica se o convite já foi usado
			if (invite.isRegistered) {
				throw appError('Email já está cadastrado!', 'CONFLICT');
			}

			// Completa o cadastro (só se o convite ainda estiver pendente)
			const employee = await EmployeesModel.findOneAndUpdate(
				{ _id: invite._id, isRegistered: false },
				{
					$set: {
						name: employeeName,
						position: employeePosition,
						password: await bcrypt.hash(password, saltRounds),
						isRegistered: true,
					},
				},
				{ new: true }
			);
			if (!employee) {
				throw appError('Email já está cadastrado!', 'CONFLICT');
			}

			return authPayload(employee);
		},

		login: async (_, { email, password }) => {
			const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

			// Busca o funcionário junto com a senha
			const employee = await EmployeesModel.findOne({ email: normalizedEmail }).select('+password');

			// Mesma mensagem para email inexistente e senha errada
			const passwordMatch = employee?.isRegistered && employee.password
				&& await bcrypt.compare(password, employee.password);
			if (!passwordMatch) {
				throw appError('Email ou senha incorretos!', 'BAD_USER_INPUT');
			}

			return authPayload(employee);
		},

		createTask: async (_, { task }, ctx) => {
			const user = requireAuth(ctx);
			const taskName = requireText(task.taskName, 'nome da tarefa');

			// Sem responsáveis, o criador entra como responsável principal
			const responsibles = task.responsibles?.length
				? await buildResponsibles(user.company, task.responsibles)
				: [{ leadershipLevel: 3, employee: user.id }];

			const taskId = await nextCounter(user.company, 'task');

			return TasksModel.create({
				company: user.company,
				taskId,
				taskName,
				description: task.description?.trim() || null,
				status: 'pendente',
				responsibles,
			});
		},

		updateTask: async (_, { taskId, task }, ctx) => {
			const user = requireLeader(ctx);
			const existingTask = await findTask(user.company, taskId);

			// Atualiza só os campos enviados
			if (task.taskName !== undefined && task.taskName !== null) {
				existingTask.taskName = requireText(task.taskName, 'nome da tarefa');
			}
			if (task.description !== undefined) {
				existingTask.description = task.description?.trim() || null;
			}
			if (task.responsibles) {
				// Lista vazia deixaria a tarefa sem responsável; ausente/null não altera
				if (task.responsibles.length === 0) {
					throw appError('Selecione ao menos um responsável!', 'BAD_USER_INPUT');
				}
				existingTask.responsibles = await buildResponsibles(user.company, task.responsibles);
			}

			return existingTask.save();
		},

		updateTaskStatus: async (_, { taskId, status }, ctx) => {
			const user = requireAuth(ctx);
			if (!TASK_STATUS.includes(status)) {
				throw appError('Status inválido!', 'BAD_USER_INPUT');
			}

			const task = await findTask(user.company, taskId);

			// Só o líder ou um responsável da tarefa pode mudar o status
			const isResponsible = task.responsibles.some((responsible) => responsible.employee.equals(user.id));
			if (user.role !== 'leader' && !isResponsible) {
				throw appError('Apenas o líder ou um responsável pode alterar o status!', 'FORBIDDEN');
			}

			// completedAt é preenchido ao concluir e volta a null ao sair de concluida
			if (status === 'concluida' && task.status !== 'concluida') {
				task.completedAt = new Date();
			} else if (status !== 'concluida') {
				task.completedAt = null;
			}
			task.status = status;

			return task.save();
		},

		deleteTask: async (_, { taskId }, ctx) => {
			const user = requireLeader(ctx);
			const { deletedCount } = await TasksModel.deleteOne({ company: user.company, taskId });
			if (!deletedCount) {
				throw appError('Tarefa não encontrada!', 'NOT_FOUND');
			}
			return true;
		},
	},

	Company: {
		// Busca os funcionários na coleção de employees
		employees: async (company) => EmployeesModel.find({ company: company._id }).sort({ employeeId: 1 }),
		createdAt: (company) => toISO(company.createdAt),
	},

	Employee: {
		company: async (employee) => CompaniesModel.findById(employee.company),
	},

	Responsibility: {
		employee: async (responsibility) => EmployeesModel.findById(responsibility.employee),
	},

	Task: {
		createdAt: (task) => toISO(task.createdAt),
		completedAt: (task) => toISO(task.completedAt),
	},
};
