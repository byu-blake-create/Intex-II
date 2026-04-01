## INTEX Web App Workflow: Integrated Development & CRISP-DM

---

### **1. Core Methodology: CRISP-DM & Research**
* **Skill:** `/crisp-dm-pipeline` + `/researcher`
* **Execution:** * Initiate **Business Understanding** to define objectives and success criteria.
    * Perform **Data Understanding** and **Preparation** to clean and transform datasets.
    * **Iterative Modeling:** Use the `/researcher` skill during the **Modeling** and **Evaluation** phases to experiment with hyperparameters and optimize model performance.

### **2. Technical Implementation: Full-Stack Development**
* **Skill:** `/full-stack-react-dotnet`
* **Execution:** * Generate the backend infrastructure using **.NET**.
    * Develop the interactive user interface with **React**.
    * Integrate the optimized model from the CRISP-DM pipeline into the application logic.

### **3. Design & Quality Assurance**
* **Skill:** `/frontend-design` + `/webapp-testing`
* **Execution:** * Apply UI/UX principles to ensure a professional and intuitive user experience.
    * Run continuous **Testing** suites to debug the frontend, API endpoints, and model integration.

### **5. Deployment**
* **Plugin:** `vercel-plugin` + `supabase-plugin`
* **Installation:**
     * **Vercel:** `claude plugin install vercel@claude-plugins-official`
     * **Supabase:** `claude plugin install supabase@claude-plugins-official`

### **5. Stakeholder Delivery**
* **Skill:** `Pptx-plugin`
* **Execution:** * Generate a final presentation summarizing findings from the CRISP-DM process.
    * Demonstrate the web app solution and how it addresses the initial business problem.

---

> **Note on Concurrency:** This workflow is non-linear. Data modeling often informs frontend requirements, and testing should occur iteratively throughout the development of both the model and the web app.
