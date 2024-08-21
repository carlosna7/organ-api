import { CompaniesModel, EmployeesModel } from '../models/company.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const saltRounds = 10;

export const resolvers = {
  Query: {
    getCompany: async (_, { companyId }) => CompaniesModel.findOne({ companyId }),
    getCompanies: async () => CompaniesModel.find(),
    getEmployees: async (_, { companyId }) => {
      const company = await CompaniesModel.findOne({ companyId });
      return company ? company.employees : [];
    },
    getEmployeeById: async (_, { companyId, employeeId }) => {
      const companies = await CompaniesModel.findOne({ companyId })
      const employee = companies.employees.find((employee) => employee.employeeId === employeeId)

      return employee;
    },
    getSomeEmployeeById: async (_, { companyId, employeeIds }) => {
      const companies = await CompaniesModel.findOne({ companyId })

      if (employeeIds < 0) {
        return companies.employees;
      } else {
        const employeeList = []

        employeeIds.forEach(element => {
          const employee = companies.employees.find((employee) => employee.employeeId === element)

          employeeList.push(employee)
        });

        return employeeList;
      }
    },
  },
  Mutation: {
    createCompany: async (_, { name, employee }) => {
      if (employee) {
        // Verifica se o email já existe no banco de dados
        const existingEmail = await EmployeesModel.findOne({ email: employee.email });
        if (existingEmail) {
          throw new Error('Email já está cadastrado!');
        }
        // Verifica se já existe uma empresa com esse nome
        const existingCompany = await CompaniesModel.findOne({ name: name });
        if (existingCompany) {
          throw new Error('Empresa já cadastrada');
        }

        // Cadastra a nova empresa
        const newCompany = new CompaniesModel({
          companyId: uuidv4(),
          name: name,
          employees: [
            {
              employeeId: 1, // primeiro id criado da empresa
              name: employee.name,
              position: employee.position,
              email: employee.email,
              password: await bcrypt.hash(employee.password, saltRounds),
              tasks: [],
              token: ""
            }
          ],
          tasks: [],
          createdAt: new Date()
        });
        // Adiciona o email ao banco de emails cadastrados
        const newEmail = new EmployeesModel({
          email: employee.email,
          company: name,
          isRegistered: true
        });

        // Salva a empresa e o email no banco de dados
        await newCompany.save();
        await newEmail.save();
        return newCompany;
      }

      return null; 
    },
    newEmployee: async (_, { companyId, email }) => {
      const company = await CompaniesModel.findOne({ companyId });
      if (!company) {
        throw new Error('Empresa não encontrada!');
      }
      if (!email) {
        throw new Error('Email necessário!');
      }

      // Verifica se o email já existe no banco de dados
      const existingEmail = await EmployeesModel.findOne({ email });
      if (existingEmail) {
        throw new Error('Email já está cadastrado!');
      }
      // Adiciona o email ao banco de emails cadastrados
      const newEmail = new EmployeesModel({
        email: email,
        company: company.name,
        isRegistered: false
      });

      // salvo email no banco de dados
      await newEmail.save();
      return newEmail;
    },
    register: async (_, { name, position, email, password }) => {
      // Verifica se o email já existe no banco de dados
      const employee = await EmployeesModel.findOne({ email });
      if (!employee) {
        throw new Error('Email não cadastrado pelo lider!');
      }
      // Verifica se o email já está cadastrado
      if (employee.isRegistered) {
        throw new Error('Email já está cadastrado!');
      } else {
        employee.isRegistered = true
      }

      const company = await CompaniesModel.findOne({ name: employee.company });
      const newEmployee = {
        employeeId: company.employees.length + 1,
        name: name,
        position: position,
        email: email,
        password: await bcrypt.hash(password, saltRounds),
        token: ""
      }

      company.employees.push(newEmployee)

      await employee.save()
      await company.save()
      return newEmployee;
    },
    // adicionar token no front end
    login: async (_, { email, password }, { res }) => {
      // Verifica se o email já existe no banco de dados
      const employee = await EmployeesModel.findOne({ email });
      if (!employee) {
        throw new Error('Email não encontrado!');
      }
      const company = await CompaniesModel.findOne({ name: employee.company });
      if (!company) {
        throw new Error('Email não possui empresa!'); 
      }
      const findEmployee = company.employees.find((employee) => employee.email === email)
      if (!findEmployee) {
        throw new Error('Usuário não cadastrado!');
      }
      const passwordMatch = await bcrypt.compare(password, findEmployee.password);
      if (!passwordMatch) {
        throw new Error('Email ou Senha incorretos!');
      }

      const token = jwt.sign({ 
        employeeId: findEmployee.employeeId,
        companyId: company.companyId
      }, process.env.JWT_SECRET, { expiresIn: '1m' });

      findEmployee.token = token
      await company.save()
      return findEmployee;
    },

    createTask: async (_, { companyId, employeeId, task }) => {
      // verifica se o id está correto
      const company = await CompaniesModel.findOne({ companyId });
      if (!company) {
        throw new Error('Empresa não encontrada!');
      }
      // captura o empregado pelo id passado
      const employee = company.employees.find((employee) => employee.employeeId === employeeId);
      if (!employee) {
        throw new Error('Funcionário não encontrado!');
      }

      const newTask = {
        taskId: company.tasks.length + 1,
        taskName: task.taskName,
        description: task.description,
        responsibles: [{
          leadershipLevel: 3,
          employee: employee
        }],
        createdAt: new Date(),
        completedAt: new Date(),
        status: "pendente"
      };

      company.tasks.push(newTask);
      await company.save();
      return newTask;
    },
  },
};

