export const typeDefs = `#graphql
  enum Role {
    leader
    member
  }

  enum TaskStatus {
    pendente
    em_andamento
    concluida
  }

  type Company {
    _id: ID!
    companyId: ID!
    name: String!
    employees: [Employee!]!
    createdAt: String!
  }

  type Employee {
    _id: ID!
    employeeId: Int!
    name: String
    position: String
    email: String!
    role: Role!
    isRegistered: Boolean!
    company: Company
  }

  type Responsibility {
    leadershipLevel: Int!
    employee: Employee
  }

  type Task {
    _id: ID!
    taskId: Int!
    taskName: String!
    description: String
    status: TaskStatus!
    responsibles: [Responsibility!]!
    createdAt: String!
    completedAt: String
  }

  type AuthPayload {
    token: String!
    employee: Employee!
  }

  input EmployeeInput {
    name: String!
    position: String!
    email: String!
    password: String!
  }

  input ResponsibleInput {
    employeeId: Int!
    leadershipLevel: Int!
  }

  input TaskInput {
    taskName: String!
    description: String
    responsibles: [ResponsibleInput!]
  }

  input TaskUpdateInput {
    taskName: String
    description: String
    responsibles: [ResponsibleInput!]
  }

  type Query {
    me: Employee!
    getCompany: Company!
    getEmployees: [Employee!]!
    getEmployeeById(employeeId: Int!): Employee
    getSomeEmployeeById(employeeIds: [Int!]): [Employee!]!
    getTasks(status: TaskStatus): [Task!]!
  }

  type Mutation {
    createCompany(name: String!, employee: EmployeeInput!): AuthPayload!
    newEmployee(email: String!): Employee!
    removeEmployee(employeeId: Int!): Boolean!
    register(name: String!, position: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createTask(task: TaskInput!): Task!
    updateTask(taskId: Int!, task: TaskUpdateInput!): Task!
    updateTaskStatus(taskId: Int!, status: TaskStatus!): Task!
    deleteTask(taskId: Int!): Boolean!
  }
`;
