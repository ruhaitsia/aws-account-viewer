import { describe, it, expect } from 'vitest';
import { transformSNSTopicsResponse, transformSQSQueuesResponse } from './messagingFetcher';

describe('transformSNSTopicsResponse', () => {
  it('should transform a full topic list', () => {
    const topics = [
      {
        arn: 'arn:aws:sns:us-east-1:123456789012:my-topic',
        attributes: {
          SubscriptionsConfirmed: '5',
          DisplayName: 'My Topic',
        },
      },
    ];

    const result = transformSNSTopicsResponse(topics);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      topicName: 'my-topic',
      topicArn: 'arn:aws:sns:us-east-1:123456789012:my-topic',
      subscriptionCount: 5,
      displayName: 'My Topic',
    });
  });

  it('should handle missing attributes with defaults', () => {
    const topics = [{ arn: 'arn:aws:sns:us-east-1:123456789012:empty-topic', attributes: {} }];
    const result = transformSNSTopicsResponse(topics);
    expect(result[0]).toEqual({
      topicName: 'empty-topic',
      topicArn: 'arn:aws:sns:us-east-1:123456789012:empty-topic',
      subscriptionCount: 0,
      displayName: '',
    });
  });

  it('should handle null/undefined input', () => {
    expect(transformSNSTopicsResponse(null as any)).toEqual([]);
    expect(transformSNSTopicsResponse(undefined as any)).toEqual([]);
  });

  it('should handle multiple topics', () => {
    const topics = [
      { arn: 'arn:aws:sns:us-east-1:123:topic-a', attributes: { SubscriptionsConfirmed: '3', DisplayName: 'A' } },
      { arn: 'arn:aws:sns:us-east-1:123:topic-b', attributes: { SubscriptionsConfirmed: '0', DisplayName: '' } },
      { arn: 'arn:aws:sns:us-east-1:123:topic-c', attributes: { SubscriptionsConfirmed: '10', DisplayName: 'C' } },
    ];
    const result = transformSNSTopicsResponse(topics);
    expect(result).toHaveLength(3);
    expect(result[0].topicName).toBe('topic-a');
    expect(result[1].topicName).toBe('topic-b');
    expect(result[2].subscriptionCount).toBe(10);
  });

  it('should extract topic name from ARN', () => {
    const topics = [{ arn: 'arn:aws:sns:ap-southeast-1:999:orders-topic', attributes: {} }];
    const result = transformSNSTopicsResponse(topics);
    expect(result[0].topicName).toBe('orders-topic');
  });

  it('should handle empty arn gracefully', () => {
    const topics = [{ arn: '', attributes: {} }];
    const result = transformSNSTopicsResponse(topics);
    expect(result[0].topicName).toBe('');
    expect(result[0].topicArn).toBe('');
  });

  it('should parse non-numeric subscription count as 0', () => {
    const topics = [{ arn: 'arn:aws:sns:us-east-1:123:t', attributes: { SubscriptionsConfirmed: 'abc' } }];
    const result = transformSNSTopicsResponse(topics);
    expect(result[0].subscriptionCount).toBe(0);
  });
});

describe('transformSQSQueuesResponse', () => {
  it('should transform a standard queue', () => {
    const queues = [
      {
        url: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
        attributes: {
          ApproximateNumberOfMessages: '10',
          ApproximateNumberOfMessagesNotVisible: '2',
          ApproximateNumberOfMessagesDelayed: '1',
        },
      },
    ];

    const result = transformSQSQueuesResponse(queues);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      queueName: 'my-queue',
      queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
      queueType: 'standard',
      visibleMessages: 10,
      invisibleMessages: 2,
      delayedMessages: 1,
    });
  });

  it('should detect FIFO queue from name', () => {
    const queues = [
      {
        url: 'https://sqs.us-east-1.amazonaws.com/123/my-queue.fifo',
        attributes: {},
      },
    ];
    const result = transformSQSQueuesResponse(queues);
    expect(result[0].queueType).toBe('fifo');
    expect(result[0].queueName).toBe('my-queue.fifo');
  });

  it('should handle missing attributes with defaults', () => {
    const queues = [{ url: 'https://sqs.us-east-1.amazonaws.com/123/q', attributes: {} }];
    const result = transformSQSQueuesResponse(queues);
    expect(result[0].visibleMessages).toBe(0);
    expect(result[0].invisibleMessages).toBe(0);
    expect(result[0].delayedMessages).toBe(0);
  });

  it('should handle null/undefined input', () => {
    expect(transformSQSQueuesResponse(null as any)).toEqual([]);
    expect(transformSQSQueuesResponse(undefined as any)).toEqual([]);
  });

  it('should handle multiple queues', () => {
    const queues = [
      { url: 'https://sqs.us-east-1.amazonaws.com/123/q1', attributes: { ApproximateNumberOfMessages: '5' } },
      { url: 'https://sqs.us-east-1.amazonaws.com/123/q2.fifo', attributes: { ApproximateNumberOfMessages: '0' } },
      { url: 'https://sqs.us-east-1.amazonaws.com/123/q3', attributes: { ApproximateNumberOfMessages: '100' } },
    ];
    const result = transformSQSQueuesResponse(queues);
    expect(result).toHaveLength(3);
    expect(result[0].queueType).toBe('standard');
    expect(result[1].queueType).toBe('fifo');
    expect(result[2].visibleMessages).toBe(100);
  });

  it('should handle empty url gracefully', () => {
    const queues = [{ url: '', attributes: {} }];
    const result = transformSQSQueuesResponse(queues);
    expect(result[0].queueName).toBe('');
    expect(result[0].queueUrl).toBe('');
  });

  it('should parse non-numeric message counts as 0', () => {
    const queues = [
      {
        url: 'https://sqs.us-east-1.amazonaws.com/123/q',
        attributes: { ApproximateNumberOfMessages: 'invalid' },
      },
    ];
    const result = transformSQSQueuesResponse(queues);
    expect(result[0].visibleMessages).toBe(0);
  });
});
