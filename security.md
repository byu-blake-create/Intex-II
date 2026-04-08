Confidentiality (Encryption) 
    Use HTTPS for all public connections. It is fine if you use a subdomain and you may rely upon certificates automatically provided by the cloud provider, but you must have a valid certificate to enable TLS. 
    Redirect HTTP traffic to HTTPS. 
Authentication 
    -Provide the functionality to authenticate users using a username/password (likely using ASP.NET Identity). Your    identity database can be in SQLite or found in a database server. 
    - Visitors (unauthenticated users) should be able to browse the home page of the site (and possibly other pages that do not need authentication) 
    - Authenticated users should be able to view the page(s) described in the IS413 section. 
    - Configure ASP.NET Identity (or your chosen Identity provider) to require better passwords than the default PasswordOptions (see https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-configuration?view=aspnetcore-10.0 for information on the settings to change, but DO NOT follow the values suggested there). This will be STRICTLY graded according to how you were taught in class and how you were instructed to implement password policies in your lab. AI or other code/documentation suggesting policies that conflict with how you were taught in class will NOT be considered a reason to grant points. 
    - All APIs should have the appropriate authentication/authorization. For example, a /login and /auth/me endpoint cannot require authentication/authorization or else they are useless, but endpoints supporting most CRUD operations (certainly all the “CUD” operations and likely some “R” operations) of the database must only be accessible/usable to authenticated and appropriately authorized users. When in doubt, make it maximally restrictive unless it breaks functionality. 

Role-Based (RBAC) Authorization 
    Only an authenticated user with an admin role should be able to add, modify, or in rare cases delete data. Only authenticated users who are donors should be able to see their donor history and the impact of those donations. Non-authenticated users without a role should be able to see some of the site (e.g., homepage, privacy policy, etc.). You may choose whether or not to have a staff (or employee) role that differs from the admin user. 
Integrity 
    Data should only be able to be changed or deleted by an authorized, authenticated user and there must be confirmation required to delete data. For example, an administrator could update or delete data because they are authorized to do so. 
Credentials 
    Handle credentials (usernames and passwords, API keys, etc.) safely. You may choose to use a secrets manager, place secrets in a separate file (e.g., an .env file) that is not uploaded to a code repository like GitHub or set environmental variables in your operating system. All three of these are viable options and will be granted full points. Some of these options are easier in deployment than others. You should not include credentials in your code or public repositories. Please note that having a functional site is worth more overall points than protecting credentials properly, so prioritize wisely (as much as this pains your instructor). Make it obvious how you are implementing this in your video. 
Privacy 
    Create and populate the content of a GDPR-compliant privacy policy that is linked from the footer of your site (at a minimum on the home page). You may use existing templates (see https://gdpr.eu/privacy-notice/) or generators, but the content should be tailored to your site. This will not be evaluated by a lawyer, and you should not pay for this. Current LLMs are quite adept at creating and modifying “boilerplate” privacy policies. 
    Enable a GDPR-compliant cookie consent notification. Be specific in your video about whether this is cosmetic or fully functional. 
Attack Mitigations 
    Enable the Content-Security-Policy (CSP) HTTP HEADER. Specify the sources you need for your site to function and no more (e.g., you might choose to define default-src, style-src, img-src, script-src, etc., but only choose what you need). It is possible to embed CSP information in a <meta> tag in the HTML, but that is not what is being evaluated here. Graders will be evaluating whether the CSP header is present in the developer tools inspector. 
Availability 
Your site should be publicly accessible. This likely means that it is deployed to a cloud provider of your selection. 
