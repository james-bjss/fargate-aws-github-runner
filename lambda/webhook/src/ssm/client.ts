import {
  GetParameterCommand,
  GetParameterCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';

export class CachingSSMClient {
  private client: SSMClient;
  private ttl: number;
  private cache: Record<string, Secret> = {};

  constructor(client: SSMClient, ttl = 0) {
    this.client = client;
    this.ttl = ttl;
  }

  public async getSecretValue(secretKey: string): Promise<string> {
    if (!this.cache[secretKey] || this.isExpired(this.cache[secretKey])) {
      let response: GetParameterCommandOutput;
      try {
        response = await this.client.send(
          new GetParameterCommand({
            Name: secretKey,
            WithDecryption: true,
          })
        );
      } catch (err) {
        throw new Error('Failed to Fetch SSM Secret');
      }
      this.cache[secretKey] = {
        value: response.Parameter.Value,
        created: new Date(),
      };
    }
    return this.cache[secretKey].value;
  }

  private isExpired(secret: Secret): boolean {
    const date = new Date();
    return (date.getTime() - secret.created.getTime()) / 1000 >= this.ttl;
  }
}

type Secret = {
  value: string;
  created: Date;
};
