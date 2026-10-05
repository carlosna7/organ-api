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
    project: Project
    responsibles: [Responsibility!]!
    createdAt: String!
    completedAt: String
  }

  type Team {
    _id: ID!
    teamId: Int!
    name: String!
    description: String
    members: [Employee!]!
    projects: [Project!]!
    createdAt: String!
  }

  type Project {
    _id: ID!
    projectId: Int!
    name: String!
    description: String
    team: Team
    tasks: [Task!]!
    createdAt: String!
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
    projectId: Int
    responsibles: [ResponsibleInput!]
  }

  input TaskUpdateInput {
    taskName: String
    description: String
    projectId: Int
    responsibles: [ResponsibleInput!]
  }

  input TeamInput {
    name: String!
    description: String
    memberIds: [Int!]
  }

  input TeamUpdateInput {
    name: String
    description: String
    memberIds: [Int!]
  }

  input ProjectInput {
    name: String!
    description: String
    teamId: Int
  }

  input ProjectUpdateInput {
    name: String
    description: String
    teamId: Int
  }

  type Query {
    me: Employee!
    getCompany: Company!
    getEmployees: [Employee!]!
    getEmployeeById(employeeId: Int!): Employee
    getSomeEmployeeById(employeeIds: [Int!]): [Employee!]!
    getTasks(status: TaskStatus): [Task!]!
    getTeams: [Team!]!
    getProjects: [Project!]!
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
    createTeam(team: TeamInput!): Team!
    updateTeam(teamId: Int!, team: TeamUpdateInput!): Team!
    deleteTeam(teamId: Int!): Boolean!
    createProject(project: ProjectInput!): Project!
    updateProject(projectId: Int!, project: ProjectUpdateInput!): Project!
    deleteProject(projectId: Int!): Boolean!
  }
`;
