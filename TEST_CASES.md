# Functional Test Cases

| Test ID | Scenario | Expected Result |
|---|---|---|
| TC-01 | Login with valid authorized account | Dashboard opens |
| TC-02 | Create scholar with complete data | Scholar saved |
| TC-03 | Create scholar without Student ID | Submission rejected |
| TC-04 | Submit semester grades | Record saved as Pending |
| TC-05 | Verify pending grade submission | Status becomes Verified |
| TC-06 | Scholar meets all requirements | Result is Compliant |
| TC-07 | Scholar fails a requirement | Result is With Deficiency |
| TC-08 | Search by Student ID/name | Matching scholar displayed |
| TC-09 | Filter by scholarship/status | Correct subset displayed |
| TC-10 | Open deployed URL | System is accessible online |

## Demonstration Data

For a quick demonstration, create a scholarship such as:

- Program: University Academic Scholarship
- Required GWA: 2.00
- Minimum Units: 15
- Allow Failing Grades: No

Then create a scholar and submit:

### Compliant example

- GWA: 1.75
- Units: 18
- Failed: 0
- Incomplete: 0

Expected: **Compliant**

### Deficiency example

- GWA: 2.25
- Units: 18
- Failed: 0
- Incomplete: 0

Expected: **With Deficiency**
