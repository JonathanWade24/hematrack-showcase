-- Query to identify subjects with complete vs incomplete assay collections
-- Complete = has plasma, DNA, Lorrca, and PBMC results
-- Incomplete = missing one or more of these assay types

WITH subject_assay_status AS (
    SELECT 
        os.subject_id,
        os.patient_mrn,
        -- Check if subject has each assay type (at least one result)
        CASE WHEN COUNT(DISTINCT rp.id) > 0 THEN 1 ELSE 0 END as has_plasma,
        CASE WHEN COUNT(DISTINCT rd.id) > 0 THEN 1 ELSE 0 END as has_dna,
        CASE WHEN COUNT(DISTINCT rl.id) > 0 THEN 1 ELSE 0 END as has_lorrca,
        CASE WHEN COUNT(DISTINCT rpb.id) > 0 THEN 1 ELSE 0 END as has_pbmc,
        
        -- Count actual results for each assay type
        COUNT(DISTINCT rp.id) as plasma_results_count,
        COUNT(DISTINCT rd.id) as dna_results_count,
        COUNT(DISTINCT rl.id) as lorrca_results_count,
        COUNT(DISTINCT rpb.id) as pbmc_results_count,
        
        -- Count total samples for this subject
        COUNT(DISTINCT s.sample_id) as total_samples
    FROM laboratory.omics_subjects os
    LEFT JOIN laboratory.samples s ON os.subject_id = s.subject_id
    LEFT JOIN laboratory.results_plasma rp ON s.sample_id = rp.sample_id
    LEFT JOIN laboratory.results_dna rd ON s.sample_id = rd.sample_id
    LEFT JOIN laboratory.results_lorrca rl ON s.sample_id = rl.sample_id
    LEFT JOIN laboratory.results_pbmc rpb ON s.sample_id = rpb.sample_id
    GROUP BY os.subject_id, os.patient_mrn
),
complete_vs_incomplete AS (
    SELECT 
        *,
        (has_plasma + has_dna + has_lorrca + has_pbmc) as assay_types_completed,
        CASE 
            WHEN (has_plasma + has_dna + has_lorrca + has_pbmc) = 4 THEN 'COMPLETE'
            ELSE 'INCOMPLETE'
        END as collection_status,
        -- Show which assays are missing
        CASE 
            WHEN has_plasma = 0 THEN 'Plasma, ' ELSE '' 
        END ||
        CASE 
            WHEN has_dna = 0 THEN 'DNA, ' ELSE '' 
        END ||
        CASE 
            WHEN has_lorrca = 0 THEN 'Lorrca, ' ELSE '' 
        END ||
        CASE 
            WHEN has_pbmc = 0 THEN 'PBMC, ' ELSE '' 
        END as missing_assays
    FROM subject_assay_status
)

-- Combine all results and apply ordering
SELECT * FROM (
    -- Main results showing both complete and incomplete subjects
    SELECT 
        'DETAIL' as report_type,
        subject_id,
        patient_mrn,
        collection_status,
        assay_types_completed as assays_completed_count,
        total_samples,
        plasma_results_count,
        dna_results_count, 
        lorrca_results_count,
        pbmc_results_count,
        CASE 
            WHEN collection_status = 'INCOMPLETE' THEN 
                TRIM(TRAILING ', ' FROM missing_assays)
            ELSE NULL 
        END as missing_assays,
        NULL::text as summary_info
    FROM complete_vs_incomplete

    UNION ALL

    -- Summary counts
    SELECT 
        'SUMMARY' as report_type,
        NULL as subject_id,
        NULL as patient_mrn,
        'TOTAL' as collection_status,
        NULL as assays_completed_count,
        NULL as total_samples,
        NULL as plasma_results_count,
        NULL as dna_results_count,
        NULL as lorrca_results_count,
        NULL as pbmc_results_count,
        NULL as missing_assays,
        CONCAT(
            'Total: ', COUNT(*), 
            ' | Complete: ', COUNT(CASE WHEN collection_status = 'COMPLETE' THEN 1 END),
            ' | Incomplete: ', COUNT(CASE WHEN collection_status = 'INCOMPLETE' THEN 1 END),
            ' | % Complete: ', ROUND(COUNT(CASE WHEN collection_status = 'COMPLETE' THEN 1 END) * 100.0 / COUNT(*), 1), '%'
        ) as summary_info
    FROM complete_vs_incomplete

    UNION ALL

    -- Breakdown by number of assays completed
    SELECT 
        'BREAKDOWN' as report_type,
        NULL as subject_id,
        NULL as patient_mrn,
        CONCAT(assay_types_completed, ' assays') as collection_status,
        assay_types_completed as assays_completed_count,
        NULL as total_samples,
        NULL as plasma_results_count,
        NULL as dna_results_count,
        NULL as lorrca_results_count,
        NULL as pbmc_results_count,
        NULL as missing_assays,
        CONCAT(
            'Count: ', COUNT(*), 
            ' | Percent: ', ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complete_vs_incomplete), 1), '%'
        ) as summary_info
    FROM complete_vs_incomplete
    GROUP BY assay_types_completed
) combined_results
ORDER BY 
    report_type,
    CASE 
        WHEN report_type = 'DETAIL' THEN 
            CASE WHEN collection_status = 'COMPLETE' THEN 1 ELSE 2 END
        WHEN report_type = 'BREAKDOWN' THEN assays_completed_count
        ELSE 1
    END,
    subject_id; 