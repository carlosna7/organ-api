import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import mongoose from 'mongoose';
import {v4 as uuidv4} from 'uuid';
import 'dotenv/config'

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
  tasks: [taskSchema]
});

const companySchema = new Schema({
  companyId: String,
  name: String,
  employees: [employeeSchema],
  createdAt: { type: Date, default: Date.now }
});

const CompaniesModel = mongoose.model('companies', companySchema);

const typeDefs = `#graphql

  type Query {
    getCompany(companyId: ID!): Company
    getCompanies: [Company]

    getEmployee(companyId: ID!, employeeId: Int!): Employee
    getEmployees(companyId: ID!): [Employee]
    getSomeEmployee(companyId: ID!, employeeIds: [Int!]): [Employee]
  }

  input EmployeeInput {
    name: String
    position: String
    email: String
    password: String
  }

  type Mutation {
    createCompany(name: String!, employee: EmployeeInput): Company
    register(name: String!, position: String!, email: String!, password: String!): Employee
  }

  type Company {
    _id: ID!
    companyId: ID!
    name: String!
    employees: [Employee]
    createdAt: String!
  }

  type Employee {
    _id: ID!
    employeeId: Int
    name: String
    position: String
    email: String
    password: String
    tasks: [Task]
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
`;

const resolvers = {
  Query: {
    getCompany: async (_, { companyId }) => CompaniesModel.findOne({ companyId }),
    getCompanies: async () => CompaniesModel.find(),

    getEmployee: async (_, { companyId, employeeId }) => {
      const companies = await CompaniesModel.findOne({ companyId })
      const employee = companies.employees.find((employee) => employee.employeeId === employeeId)

      return employee;
    },
    getEmployees: async (_, { companyId }) => {
      const companies = await CompaniesModel.findOne({ companyId })

      return companies.employees;
    },
    getSomeEmployee: async (_, { companyId, employeeIds }) => {
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
            tasks: []
          }
        ],
        createdAt: new Date()
      });
      
      await newCompany.save();

      return newCompany;
    },

    register: async (_, { name, position, email, password }) => {

      // recebe todas a empresas
      const companies = await CompaniesModel.find();

      if (!companies || companies.length === 0) {
        throw new Error('Company not found');
      }

      // identificação para registro (caso o email não exista o registro não funciona)
      const findAuthorizedEmail = companies
        .map((company) => company.employees) // pega somente os employees de cada empresa
        .flat()
        .filter((employees) => employees.email === email) // filtra somento o email dentro da lista de empregados que o usuário com permissão adicionou na lista de registros

      if (findAuthorizedEmail.length === 0) {
        throw new Error('Email not authorized');
      }

      const authorizedEmail = findAuthorizedEmail[0].email;

      if (authorizedEmail) {

        const employeeToEdit = companies
        .map((company) => company.employees)
        .flat()
        .filter((employees) => employees.email === email)

        const newEmployee = {
          employeeId: employeeToEdit[0].employeeId,
          name: name,
          position: position,
          email: authorizedEmail,
          password: password, // CRIPTOGRAFAR
          tasks: []
        };

        console.log(newEmployee);
  
        company.employees.push(newEmployee);
  
        await company.save();
  
        return newEmployee;

      } else {
        console.log("Email não adicionado pelo lider");
      }
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