import {
  GetParameterCommand,
  GetParameterCommandOutput,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';

export class SSMCache {
  private client: SSMClient;
  private ttl: number;
  private cache: Record<string, Secret> = {};

  constructor(client: SSMClient, ttl: number = 0) {
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
        throw new Error(`Failed to Fetch SSM Secret: ${err.message}`);
      }
      this.cache[secretKey] = {
        value: response.Parameter.Value,
        created: new Date(),
      };
    }
    return this.cache[secretKey].value;
  }

  public async putSecureKey(
    secretKey: string,
    value: string,
    description: string = ''
  ): Promise<void> {
    try {
      await this.client.send(
        new PutParameterCommand({
          Name: secretKey,
          Description: description,
          Value: value,
          Type: 'SecureString',
        })
      );
    } catch (err) {
      throw new Error(`Failed to Write SSM Secret: ${err.message}`);
    }
    return;
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
