export const typeDefs = `#graphql
  type Company {
    _id: ID!
    companyId: ID!
    name: String!
    employees: [Employee]
    tasks: [Task]
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
    token: String
  }

  type Responsibility {
    leadershipLevel: Int
    employee: Employee
  }

  type Task {
    taskId: Int
    taskName: String
    description: String
    responsibles: [Responsibility]
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

  input TaskInput {
    taskName: String
    description: String
  }

  type Mutation {
    createCompany(name: String!, employee: EmployeeInput): Company
    newEmployee(companyId: ID!, email: String!): AllEmails
    register(name: String!, position: String!, email: String!, password: String!): Employee
    login(email: String!, password: String!): Employee
    createTask(companyId: ID!, employeeId: Int!, task: TaskInput): Task
  }
`;
