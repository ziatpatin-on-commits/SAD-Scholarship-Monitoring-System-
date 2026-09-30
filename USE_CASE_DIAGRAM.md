# Use Case Diagram

You can paste the following Mermaid diagram into a Mermaid-compatible Markdown viewer.

```mermaid
flowchart LR
    Scholar([Scholar])
    Staff([Scholarship Staff])
    Coordinator([Scholarship Coordinator])
    Admin([System Administrator])

    subgraph SYS[Student Scholarship Monitoring and Academic Compliance System]
      Login((Login))
      Register((Register Scholar))
      Assign((Assign Scholarship))
      Configure((Configure Scholarship Requirements))
      ViewReq((View Requirements))
      Submit((Submit Grades))
      Verify((Verify Grade Submission))
      Evaluate((Evaluate Academic Compliance))
      Deficiency((Record Deficiency))
      ViewDef((View Deficiency))
      Status((Update Scholar Status))
      Renewal((Process Scholarship Renewal))
      Search((Search Scholar))
      Filter((Filter Scholars))
      Report((Generate Compliance Report))
      Dashboard((View Dashboard))
      Logout((Logout))
    end

    Scholar --> Login
    Scholar --> Submit
    Scholar --> ViewReq
    Scholar --> ViewDef
    Scholar --> Logout

    Staff --> Login
    Staff --> Register
    Staff --> Assign
    Staff --> ViewReq
    Staff --> Submit
    Staff --> Verify
    Staff --> Search
    Staff --> Filter
    Staff --> Dashboard
    Staff --> Logout

    Coordinator --> Login
    Coordinator --> Configure
    Coordinator --> Verify
    Coordinator --> Evaluate
    Coordinator --> Deficiency
    Coordinator --> Status
    Coordinator --> Renewal
    Coordinator --> Report
    Coordinator --> Dashboard
    Coordinator --> Logout

    Admin --> Login
    Admin --> Register
    Admin --> Configure
    Admin --> Search
    Admin --> Filter
    Admin --> Report
    Admin --> Dashboard
    Admin --> Logout

    Verify -.->|<<include>>| Evaluate
    Evaluate -.->|<<include>>| Status
    Evaluate -.->|<<include>>| Deficiency
    Search -.->|<<include>>| Filter
    Renewal -.->|<<extend>>| Status
    Deficiency -.->|<<extend>>| Report
```

The laboratory requires at least 15 use cases, actors, a system boundary, three `<<include>>` relationships, and two `<<extend>>` relationships.
