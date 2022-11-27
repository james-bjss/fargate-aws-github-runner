## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 0.14.1 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 4.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | ~> 4.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_apigatewayv2_api.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api) | resource |
| [aws_apigatewayv2_integration.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration) | resource |
| [aws_apigatewayv2_route.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route) | resource |
| [aws_apigatewayv2_stage.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage) | resource |
| [aws_cloudwatch_log_group.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_iam_role.webhook_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.webhook_logging](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy.webhook_sqs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy.webhook_ssm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_lambda_function.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function) | resource |
| [aws_lambda_permission.webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission) | resource |
| [aws_iam_policy_document.lambda_assume_role_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_github_app_webhook_secret"></a> [github\_app\_webhook\_secret](#input\_github\_app\_webhook\_secret) | SQS queue to publish accepted build events. | <pre>object({<br>    name = string<br>    arn  = string<br>  })</pre> | n/a | yes |
| <a name="input_kms_key_arn"></a> [kms\_key\_arn](#input\_kms\_key\_arn) | Optional CMK Key ARN to be used for Parameter Store. | `string` | `null` | no |
| <a name="input_lambda_architecture"></a> [lambda\_architecture](#input\_lambda\_architecture) | AWS Lambda architecture. Lambda functions using Graviton processors ('arm64') tend to have better price/performance than 'x86\_64' functions. | `string` | `"x86_64"` | no |
| <a name="input_lambda_runtime"></a> [lambda\_runtime](#input\_lambda\_runtime) | AWS Lambda runtime. | `string` | `"nodejs16.x"` | no |
| <a name="input_lambda_timeout"></a> [lambda\_timeout](#input\_lambda\_timeout) | Time out of the lambda in seconds. | `number` | `10` | no |
| <a name="input_lambda_zip"></a> [lambda\_zip](#input\_lambda\_zip) | File location of the lambda zip file. | `string` | `null` | no |
| <a name="input_log_level"></a> [log\_level](#input\_log\_level) | Logging level for lambda logging. Valid values are  'silly', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'. | `string` | `"info"` | no |
| <a name="input_logging_kms_key_id"></a> [logging\_kms\_key\_id](#input\_logging\_kms\_key\_id) | Specifies the kms key id to encrypt the logs with | `string` | `null` | no |
| <a name="input_logging_retention_in_days"></a> [logging\_retention\_in\_days](#input\_logging\_retention\_in\_days) | Specifies the number of days you want to retain log events for the lambda log group. Possible values are: 0, 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, and 3653. | `number` | `7` | no |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | The prefix used for naming resources | `string` | `"github-actions"` | no |
| <a name="input_role_path"></a> [role\_path](#input\_role\_path) | The path that will be added to the role; if not set, the environment name will be used. | `string` | `null` | no |
| <a name="input_role_permissions_boundary"></a> [role\_permissions\_boundary](#input\_role\_permissions\_boundary) | Permissions boundary that will be added to the created role for the lambda. | `string` | `null` | no |
| <a name="input_sqs_build_queue"></a> [sqs\_build\_queue](#input\_sqs\_build\_queue) | SQS queue to publish accepted build events. | <pre>object({<br>    id  = string<br>    arn = string<br>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags that will be added to created resources. By default resources will be tagged with name and environment. | `map(string)` | `{}` | no |
| <a name="input_webhook_lambda_apigateway_access_log_settings"></a> [webhook\_lambda\_apigateway\_access\_log\_settings](#input\_webhook\_lambda\_apigateway\_access\_log\_settings) | Access log settings for webhook API gateway. | <pre>object({<br>    destination_arn = string<br>    format          = string<br>  })</pre> | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_endpoint_relative_path"></a> [endpoint\_relative\_path](#output\_endpoint\_relative\_path) | n/a |
| <a name="output_gateway"></a> [gateway](#output\_gateway) | n/a |
| <a name="output_lambda"></a> [lambda](#output\_lambda) | n/a |
| <a name="output_role"></a> [role](#output\_role) | n/a |
