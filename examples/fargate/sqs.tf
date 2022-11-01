
resource "aws_sqs_queue" "webhook_events_workflow_job_queue" {
  name                        = "webhook-events-workflow-job-queue.fifo"
  delay_seconds               = 0
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400 // one day
  fifo_queue                  = true
  receive_wait_time_seconds   = 0
  content_based_deduplication = false //revisit..
  redrive_policy              = null

  // revist SSE
}