# ScholarTrack — Student Scholarship Monitoring System

A complete Systems Analysis and Design laboratory prototype for the **Student Scholarship Monitoring and Academic Compliance System**.

## 1. Technology

- HTML5
- CSS3
- JavaScript
- Supabase PostgreSQL
- Supabase Authentication
- GitHub
- GitHub Pages

The laboratory requires a vertical workflow from scholar registration through grade submission, verification, compliance evaluation, and monitoring.

## 2. Project Structure

```text
SAD-Scholarship-Monitoring-System/
├── index.html
├── login.html
├── supabase.sql
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── supabase.js
│   ├── login.js
│   └── app.js
└── docs/
    ├── USE_CASE_DIAGRAM.md
    ├── ERD.md
    └── TEST_CASES.md
```

## 3. Supabase Setup

### Step 1 — Create a project

Create a Supabase project.

### Step 2 — Run the SQL

Open:

**Supabase → SQL Editor → New query**

Copy the complete contents of `supabase.sql` and run it.

The SQL creates:

- `profiles`
- `scholarship_programs`
- `scholars`
- `grade_submissions`
- authentication trigger
- updated-at triggers
- compliance verification function
- Row Level Security policies
- sample scholarship programs

### Step 3 — Create a login account

Go to:

**Supabase → Authentication → Users → Add user**

Create an email/password account.

The SQL trigger automatically creates a `profiles` row with role `staff`.

To make the first account an administrator, copy its user UUID and run:

```sql
update public.profiles
set role = 'admin',
    full_name = 'System Administrator'
where id = 'YOUR-AUTH-USER-UUID';
```

### Step 4 — Configure the website

Open:

```text
js/supabase.js
```

Replace:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

with the values from:

**Supabase → Project Settings → API**

Use the browser-safe anon/publishable key. Never place a `service_role` key in this project.

## 4. How the Workflow Works

1. Authorized user logs in.
2. Staff creates a scholar.
3. Staff assigns a scholarship program.
4. Staff submits semester grades.
5. New submission starts as `Pending`.
6. Authorized staff verifies the submission.
7. The database function evaluates the verified submission.
8. The scholar becomes `Compliant` or `With Deficiency`.
9. Dashboard counts update.
10. Search and filtering can be used for monitoring.

## 5. Compliance Rule

This version uses the following documented comparison:

```text
GWA <= required_gwa
AND
units_enrolled >= minimum_units
AND
failing-grade rule is satisfied
AND
incomplete_subjects = 0
```

If all conditions are true:

```text
Compliant
```

Otherwise:

```text
With Deficiency
```

### Important

The laboratory says students must adapt the GWA comparison to the institution's grading system. If your school treats a higher GWA as better, modify both the SQL function and the JavaScript evaluation function.

## 6. Testing

See:

```text
docs/TEST_CASES.md
```

The project includes tests corresponding to the laboratory scenarios:

- valid login
- create scholar
- invalid scholar without Student ID
- submit grades
- verify submission
- compliant evaluation
- deficient evaluation
- scholar search
- filtering
- deployed URL

## 7. Run Locally

Because the project uses browser JavaScript modules through a CDN and Supabase, use a local web server rather than opening `index.html` directly.

### VS Code

Install the **Live Server** extension.

Then:

1. Open the project folder in VS Code.
2. Right-click `login.html`.
3. Select **Open with Live Server**.
4. Log in using your Supabase account.

## 8. GitHub Pages Structure

This version is arranged specifically for GitHub Pages:

```text
index.html       = public login page / site entry
dashboard.html   = protected application dashboard
404.html         = simple GitHub Pages fallback
.nojekyll        = prevents Jekyll processing
```

The application redirects:

```text
index.html → login
successful login → dashboard.html
unauthenticated dashboard access → index.html
logout → index.html
```

## 9. GitHub

In VS Code terminal:

```bash
git init
git add .
git commit -m "Initialize scholarship monitoring system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SAD-Scholarship-Monitoring-System.git
git push -u origin main
```

Suggested meaningful commits:

```text
Initialize scholarship monitoring system
Create scholar and scholarship database modules
Implement grade submission and verification
Add compliance evaluation dashboard and deployment
```

## 10. GitHub Pages Deployment

1. Create a GitHub repository.
2. Upload/push all files from this folder.
3. Open the repository on GitHub.
4. Go to **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main`.
7. Select folder `/ (root)`.
8. Click **Save**.
9. Wait for GitHub Pages to publish.
10. Open the generated URL.

The root URL opens `index.html`, which is already the login page.

### Recommended Git commands

```bash
git init
git add .
git commit -m "Initialize GitHub Pages scholarship monitoring system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SAD-Scholarship-Monitoring-System.git
git push -u origin main
```

After publishing, your URL will normally look like:

```text
https://YOUR_USERNAME.github.io/SAD-Scholarship-Monitoring-System/
```

If you use a custom repository name, GitHub Pages will use that repository name in the URL.

## 11. Security Notes

- Supabase Auth protects the login.
- Row Level Security is enabled.
- Staff/admin are allowed to verify submissions.
- The verification function checks the user's role.
- Do not publish a service-role key.
- For production use, review every RLS policy with your instructor or system administrator.

## 12. Laboratory Traceability

| Requirement | Use Case | Implemented Feature |
|---|---|---|
| FR-01 | Register Scholar | Scholar Form |
| FR-02 | Assign Scholarship | Scholar Form |
| FR-03 | Configure Scholarship Requirements | Scholarship Programs |
| FR-04 | Submit Grades | Grade Submission Form |
| FR-06 | Verify Grade Submission | Verification Function |
| FR-07 | Evaluate Academic Compliance | PostgreSQL compliance function + Compliance page |
| FR-08 | Record Deficiency | Evaluation status/reason |
| FR-09 | Update Scholar Status | Scholar status update |
| FR-10 | Monitor Pending Submissions | Dashboard + Grade Submissions |
| FR-14 | Search Scholars | Scholar search |
| FR-15 | Generate/monitor reports | Dashboard and compliance table |

## 13. Core Business Rules Implemented

- Every scholar is assigned to a scholarship program.
- Every program defines academic requirements.
- Each grade submission belongs to one scholar, academic year, and semester.
- Only authorized personnel can verify grades.
- Only verified records are evaluated.
- A scholar cannot be marked compliant when mandatory conditions fail.
- Scholar status follows the assigned scholarship requirements.
- Verification records store verifier and verification time.
- A verified submission cannot be verified again.
- Grade information is protected by authentication/RLS.

## 14. Before Demonstration

Make sure you can demonstrate:

1. Login
2. Add scholarship program
3. Add scholar
4. Assign scholarship
5. Submit semester grades
6. Show Pending status
7. Verify the submission
8. Show Compliant result
9. Change data and demonstrate With Deficiency
10. Search for a scholar
11. Filter scholars
12. Explain which requirement produced each feature

This follows the laboratory's required end-to-end workflow:
Requirement → Use Case → Database Record → User Action → Business Rule → System Result → Test.
