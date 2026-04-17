import {
  SNSClient,
  ListTopicsCommand,
  GetTopicAttributesCommand,
} from '@aws-sdk/client-sns';
import {
  SQSClient,
  ListQueuesCommand,
  GetQueueAttributesCommand,
  QueueAttributeName,
} from '@aws-sdk/client-sqs';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface SNSTopic {
  topicName: string;
  topicArn: string;
  subscriptionCount: number;
  displayName: string;
}

interface SQSQueue {
  queueName: string;
  queueUrl: string;
  queueType: 'standard' | 'fifo';
  visibleMessages: number;
  invisibleMessages: number;
  delayedMessages: number;
}

interface SQSQueueDetail {
  visibilityTimeout: number;
  messageRetentionPeriod: number;
  maxMessageSize: number;
  deadLetterQueue?: string;
}

interface FetchResult<T> {
  data: T;
  timestamp: number;
  region: string;
  error?: { code: string; message: string };
}

interface ClientConfig {
  credentials: { accessKeyId: string; secretAccessKey: string };
  region: string;
}

/**
 * Transform raw SNS topic attributes into SNSTopic[].
 * Each entry is { arn, attributes } where attributes come from GetTopicAttributes.
 * Exported for testability.
 */
export function transformSNSTopicsResponse(
  topics: { arn: string; attributes: Record<string, string> }[],
): SNSTopic[] {
  return (topics ?? []).map((t) => {
    const arn = t.arn ?? '';
    const parts = arn.split(':');
    const topicName = parts.length > 0 ? parts[parts.length - 1] : '';
    return {
      topicName,
      topicArn: arn,
      subscriptionCount: parseInt(t.attributes?.SubscriptionsConfirmed ?? '0', 10) || 0,
      displayName: t.attributes?.DisplayName ?? '',
    };
  });
}

/**
 * Transform raw SQS queue attributes into SQSQueue[].
 * Each entry is { url, attributes } where attributes come from GetQueueAttributes.
 * Exported for testability.
 */
export function transformSQSQueuesResponse(
  queues: { url: string; attributes: Record<string, string> }[],
): SQSQueue[] {
  return (queues ?? []).map((q) => {
    const url = q.url ?? '';
    const urlParts = url.split('/');
    const queueName = urlParts.length > 0 ? urlParts[urlParts.length - 1] : '';
    const isFifo = queueName.endsWith('.fifo');
    return {
      queueName,
      queueUrl: url,
      queueType: isFifo ? 'fifo' : 'standard',
      visibleMessages: parseInt(q.attributes?.ApproximateNumberOfMessages ?? '0', 10) || 0,
      invisibleMessages: parseInt(q.attributes?.ApproximateNumberOfMessagesNotVisible ?? '0', 10) || 0,
      delayedMessages: parseInt(q.attributes?.ApproximateNumberOfMessagesDelayed ?? '0', 10) || 0,
    };
  });
}

/**
 * Fetch all SNS topics and SQS queues for the given region.
 */
export async function fetchMessagingData(
  clientConfig: ClientConfig,
): Promise<FetchResult<{ topics: SNSTopic[]; queues: SQSQueue[] }>> {
  try {
    const snsClient = new SNSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });
    const sqsClient = new SQSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    // Fetch SNS topics
    const topicArns: string[] = [];
    let nextToken: string | undefined;
    do {
      const resp = await snsClient.send(new ListTopicsCommand({ NextToken: nextToken }));
      for (const t of resp.Topics ?? []) {
        if (t.TopicArn) topicArns.push(t.TopicArn);
      }
      nextToken = resp.NextToken;
    } while (nextToken);

    // Get attributes for each topic
    const topicDetails = await Promise.all(
      topicArns.map(async (arn) => {
        try {
          const attrResp = await snsClient.send(new GetTopicAttributesCommand({ TopicArn: arn }));
          return { arn, attributes: (attrResp.Attributes ?? {}) as Record<string, string> };
        } catch {
          return { arn, attributes: {} as Record<string, string> };
        }
      }),
    );

    // Fetch SQS queues
    const queueUrls: string[] = [];
    let sqsNextToken: string | undefined;
    do {
      const resp = await sqsClient.send(new ListQueuesCommand({ NextToken: sqsNextToken }));
      for (const url of resp.QueueUrls ?? []) {
        queueUrls.push(url);
      }
      sqsNextToken = resp.NextToken;
    } while (sqsNextToken);

    // Get attributes for each queue
    const ALL_ATTRS: QueueAttributeName[] = [
      'ApproximateNumberOfMessages',
      'ApproximateNumberOfMessagesNotVisible',
      'ApproximateNumberOfMessagesDelayed',
    ];
    const queueDetails = await Promise.all(
      queueUrls.map(async (url) => {
        try {
          const attrResp = await sqsClient.send(
            new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ALL_ATTRS }),
          );
          return { url, attributes: (attrResp.Attributes ?? {}) as Record<string, string> };
        } catch {
          return { url, attributes: {} as Record<string, string> };
        }
      }),
    );

    return {
      data: {
        topics: transformSNSTopicsResponse(topicDetails),
        queues: transformSQSQueuesResponse(queueDetails),
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { topics: [], queues: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch messaging data',
      },
    };
  }
}

/**
 * Fetch detailed attributes for a specific SQS queue.
 */
export async function fetchSQSQueueDetail(
  clientConfig: ClientConfig,
  queueUrl: string,
): Promise<FetchResult<SQSQueueDetail>> {
  try {
    const sqsClient = new SQSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const DETAIL_ATTRS: QueueAttributeName[] = [
      'VisibilityTimeout',
      'MessageRetentionPeriod',
      'MaximumMessageSize',
      'RedrivePolicy',
    ];

    const resp = await sqsClient.send(
      new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: DETAIL_ATTRS }),
    );

    const attrs = resp.Attributes ?? {};
    let deadLetterQueue: string | undefined;
    if (attrs.RedrivePolicy) {
      try {
        const policy = JSON.parse(attrs.RedrivePolicy);
        deadLetterQueue = policy.deadLetterTargetArn;
      } catch {
        // ignore parse errors
      }
    }

    return {
      data: {
        visibilityTimeout: parseInt(attrs.VisibilityTimeout ?? '30', 10),
        messageRetentionPeriod: parseInt(attrs.MessageRetentionPeriod ?? '345600', 10),
        maxMessageSize: parseInt(attrs.MaximumMessageSize ?? '262144', 10),
        deadLetterQueue,
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: {
        visibilityTimeout: 0,
        messageRetentionPeriod: 0,
        maxMessageSize: 0,
      },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch SQS queue detail',
      },
    };
  }
}
