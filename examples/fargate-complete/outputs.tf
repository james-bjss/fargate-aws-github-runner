output "webhook_url" {
  value = format("%s/%s", module.webhook.gateway.api_endpoint, module.webhook.endpoint_relative_path)
}
