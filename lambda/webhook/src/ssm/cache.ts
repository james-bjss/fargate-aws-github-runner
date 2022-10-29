import { GetParameterCommandOutput, SSM } from '@aws-sdk/client-ssm';

export class SSMCache {
  private client: SSM;
  private ttl: number;
  private cache: Record<string, Secret> = {};

  constructor(client: SSM, ttl: number = 0) {
    this.client = client;
    this.ttl = ttl;
  }

  public async getSecretValue(secretKey: string): Promise<string> {
    if (!this.cache[secretKey] || this.isExpired(this.cache[secretKey])) {
      let response: GetParameterCommandOutput;
      try {
        response = await this.client.getParameter({
          Name: secretKey,
          WithDecryption: true,
        });
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
    return (secret.created.getTime() - date.getTime()) / 1000 <= this.ttl;
  }
}

type Secret = {
  value: string;
  created: Date;
};
