$runs = Invoke-RestMethod -Uri 'https://api.github.com/repos/SaamVR/EcomCMS/actions/runs?per_page=1'
$runId = $runs.workflow_runs[0].id
$jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/SaamVR/EcomCMS/actions/runs/$runId/jobs"
$jobId = $jobs.jobs[0].id
Invoke-WebRequest -Uri "https://api.github.com/repos/SaamVR/EcomCMS/actions/jobs/$jobId/logs" -OutFile log.txt
Get-Content log.txt -Tail 300
