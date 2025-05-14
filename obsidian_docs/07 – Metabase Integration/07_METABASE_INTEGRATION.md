---
tags: [moc, metabase, analytics, reporting, bi]
aliases: [Metabase, Analytics, Business Intelligence, Reporting]
---

# 06 – Metabase Integration

This document provides guidelines for using the external Metabase instance connected to the application's PostgreSQL database for analytics, reporting, and data exploration.

## 1. Accessing Metabase

- **Metabase URL**: `[TODO: Add the direct URL to your Metabase instance, e.g., https://metabase.yourcompany.com]`
- **Login Credentials**: `[TODO: Specify how developers/users get Metabase accounts. Is it SSO, admin-created, or self-signup? Link to [[05_USER_AND_PERMISSIONS]] if Metabase users are related to app users.]`
- **Data Source**: Metabase is connected to the PostgreSQL database (`[TODO: Specify database name, e.g., scd_dashboard_prod]`). It likely connects to the primary instance or a read replica.
    - `[TODO: Confirm if Metabase connects to a read-replica or the primary database. If replica, note any potential data lag.]`
    - `[TODO: Specify which PostgreSQL schemas Metabase has access to, e.g., clinical, laboratory, app. This is important for data discovery within Metabase.]`

## 2. Recommended Metabase Structure

To keep Metabase organized and useful, consider the following structure for Questions, Dashboards, and Collections.

### 2.1. Collections (Folders)
Organize questions and dashboards into collections based on data domain or purpose.

- **`01 - Clinical Data`**
    - `Patient Demographics`
    - `Lab Orders & Results (Clinical)`
    - `Medication Insights`
    - `[TODO: Add other relevant clinical sub-collections]`
- **`02 - Laboratory Data`**
    - `Sample Processing Funnel`
    - `Assay Results - DNA`
    - `Assay Results - Adhesion`
    - `Assay Results - [Other Assays]`
    - `QC Metrics`
    - `[TODO: Add other relevant laboratory sub-collections]`
- **`03 - App & User Metrics`**
    - `User Activity`
    - `Data Entry Audits (if applicable)`
    - `[TODO: Add other relevant app-specific sub-collections]`
- **`04 - Cross-Functional / Project-Specific`**
    - `[Project Name] Dashboards`
    - `[Specific Study] Reports`
- **`XX - Sandbox / User Folders`** (For individual exploration before sharing)

### 2.2. Naming Conventions for Questions & Dashboards
- **Prefix with Number for Ordering (Optional)**: If a specific order is important within a collection.
- **Clear, Descriptive Titles**: E.g., "Monthly New Patient Registrations", "DNA Assay QC Pass Rate Over Time".
- **Indicate Data Source/Focus**: E.g., "Clinical: Average Length of Stay by Ward", "Lab: Samples Collected per Week".

## 3. Creating and Sharing Questions (Queries)

### 3.1. Creating Questions
- **Start with Raw Data**: Explore tables in the `clinical`, `laboratory`, and `app` schemas (or as configured for Metabase access).
- **Use the Query Builder**: For most queries, Metabase's graphical query builder is sufficient.
- **SQL for Complex Queries**: For more complex logic, use the SQL editor.
    - When writing SQL, explicitly name schemas: `SELECT * FROM laboratory.samples LIMIT 10;`
- **Save Questions**: Save useful questions to appropriate collections.
- **Add Descriptions**: Clearly describe what the question shows and any assumptions made.

### 3.2. Building Dashboards
- Combine related questions into dashboards for a consolidated view.
- Use filters on dashboards to allow for interactive exploration (e.g., date range, patient cohort).

### 3.3. Sharing Queries & Dashboards
- **Permissions**: Understand Metabase permissions. Who can view/edit collections, dashboards, and questions?
    - `[TODO: Briefly describe Metabase permission model or link to Metabase admin/docs if complex.]`
- **Sharing Links**: Use Metabase's sharing options to provide links to dashboards or questions.
- **Embedding (If Applicable)**: If Metabase charts are embedded elsewhere, document how this is done.
    - `[TODO: Note if embedding is used and any security considerations.]`
- **Public Links (Use with Caution)**: If public sharing is enabled, ensure data is appropriately anonymized or aggregated if shared outside the organization.

## 4. Best Practices for Metabase Usage

- **Performance**: Be mindful of query performance, especially on large tables. Avoid `SELECT *` without `LIMIT` in the SQL editor for exploration. Use filters and aggregations to reduce data transfer.
- **Data Accuracy**: Understand the source data. Refer to [[03_DATABASE]] for schema details.
- **Documentation**: Document complex queries or calculations within the Metabase question description.
- **Avoid Modifying Production Data**: Metabase should ideally connect with a user that has read-only permissions to prevent accidental data modification. `[TODO: Confirm the permissions of the Metabase database user.]`
- **Regular Review**: Periodically review and archive outdated or unused questions and dashboards to keep the instance clean.

## 5. Syncing and Data Freshness

- **Metabase Sync Schedule**: Metabase periodically scans table schemas and syncs metadata.
    - `[TODO: Find out and document Metabase's sync schedule for this instance.]`
- **Caching**: Metabase caches query results.
    - `[TODO: Document default caching policies or how to manage caching for specific questions if known.]`
This means data viewed in Metabase might not always be real-time to the exact second. Understand any potential lag, especially for critical reporting.

## 6. Troubleshooting Metabase Issues

- **Incorrect Data**: Verify your query logic. Check filters and joins. Compare with data directly from the PostgreSQL database if necessary.
- **Permissions Issues**: Contact a Metabase administrator if you cannot access expected data or features.
- **Performance Problems**: Simplify your query. Add filters. If using SQL, analyze the query plan.
- **Connection Errors**: Report to administrators. May indicate issues with the database or Metabase itself.

---
Links to: [[02 – System Architecture]], [[03 – Database]], [[05 – User & Permissions]] 