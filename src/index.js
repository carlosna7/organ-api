import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import mongoose from 'mongoose';
import {v4 as uuidv4} from 'uuid';
import 'dotenv/config'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const saltRounds = 10;

mongoose.connect(process.env.MONGO_DB)

const { Schema } = mongoose;

const taskSchema = new Schema({
  taskId: Number,
  taskName: String,
  description: String,
  leadershipLevel: Number,
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: Date.now },
  status: String
});

const employeeSchema = new Schema({
  employeeId: Number,
  name: String,
  position: String,
  email: String,
  password: String,
  tasks: [taskSchema],
  token: String
});

const allEmailsSchema = new Schema({
  email: String,
  company: String,
  isRegistered: { type: Boolean, default: false }
})

const companySchema = new Schema({
  companyId: String,
  name: String,
  employees: [employeeSchema],
  createdAt: { type: Date, default: Date.now }
});

const CompaniesModel = mongoose.model('companies', companySchema);
const EmployeesModel = mongoose.model('employees', allEmailsSchema);

const typeDefs = `#graphql

  type Company {
    _id: ID!
    companyId: ID!
    name: String!
    employees: [Employee]
    createdAt: String!
  }

  type AllEmails {
    email: String
    company: String
    isRegistered: Boolean
  }

  type Employee {
    _id: ID!
    employeeId: Int
    name: String
    position: String
    email: String
    password: String
    tasks: [Task]
    token: String
  }

  type Task {
    taskId: Int
    taskName: String
    description: String
    leadershipLevel: Int
    createdAt: String
    completedAt: String
    status: String
  }

  type Query {
    getCompany(companyId: ID!): Company
    getCompanies: [Company]

    getEmployees(companyId: ID!): [Employee]
    getEmployeeById(companyId: ID!, employeeId: Int!): Employee
    getSomeEmployeeById(companyId: ID!, employeeIds: [Int!]): [Employee]
  }

  input EmployeeInput {
    name: String
    position: String
    email: String!
    password: String
  }

  type Mutation {
    createCompany(name: String!, employee: EmployeeInput): Company
    newEmployee(companyId: ID!, email: String!): AllEmails
    register(name: String!, position: String!, email: String!, password: String!): Employee
    login(email: String!, password: String!): Employee
  }
`;

const resolvers = {
  Query: {
    getCompany: async (_, { companyId }) => CompaniesModel.findOne({ companyId }),
    getCompanies: async () => CompaniesModel.find(),

    getEmployees: async (_, { companyId }) => {
      const companies = await CompaniesModel.findOne({ companyId })

      return companies.employees;
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
          return null;
        }

        // Verifica se já existe uma empresa com esse nome
        const existingCompany = await CompaniesModel.findOne({ name: name });
        if (existingCompany) {
          throw new Error('Empresa já cadastrada');
          return null;
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
              password: employee.password,
              tasks: [],
              token: ""
            }
          ],
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
      }

      const company = await CompaniesModel.findOne({ name: employee.company });

      const newEmployee = {
        employeeId: company.employees.length + 1,
        name: name,
        position: position,
        email: email,
        password: await bcrypt.hash(password, saltRounds),
        tasks: [],
        token: ""
      }

      company.employees.push(newEmployee)
      await company.save()

      return newEmployee;
    },
    login: async (_, { email, password }) => {
      
      // Verifica se o email já existe no banco de dados
      const employee = await EmployeesModel.findOne({ email });
      if (!employee) {
        throw new Error('Email não cadastrado!');
      }

      // Conferência prolixa
      const company = await CompaniesModel.findOne({ name: employee.company });
      if (!company) {
        throw new Error('Empresa não encontrada!');
      }

      const findEmployee = company.employees.find((employee) => employee.email === email)
      if (!findEmployee) {
        throw new Error('Usuário não cadastrado!');
      }

      const passwordMatch = await bcrypt.compare(password, findEmployee.password);
      const emailMatch = email === findEmployee.email; // Desnecessário
      if (!passwordMatch || !emailMatch) {
        throw new Error('Email ou Senha incorretos!');
      }

      const token = jwt.sign({ employeeId: findEmployee.employeeId }, process.env.JWT_SECRET, { expiresIn: '1h' });

      findEmployee.token = token

      // await company.save()

      return findEmployee;
    }
  }
};

// The ApolloServer constructor requires two parameters: your schema
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 3000 },
});

console.log(`🚀  Server ready at: ${url}`);