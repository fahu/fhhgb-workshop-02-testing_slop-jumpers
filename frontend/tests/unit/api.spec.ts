import { afterEach, describe, expect, test } from 'vitest';
import { ApiError, errorMessage, request } from '../../src/api';

describe('request', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('a bad gateway rejects the request with the HTTP status and server diagnostic', async () => {
    // Arrange
    const diagnostic = 'Upstream server unavailable';
    globalThis.fetch = async () => Response.json({ message: diagnostic }, { status: 502 });

    // Act
    const result = request('/leaderboard');

    // Assert
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status: 502, serverMessage: diagnostic });
  });

  test('a bad gateway gives the player a public availability message', async () => {
    // Arrange
    globalThis.fetch = async () => Response.json({ message: 'Upstream server unavailable' }, { status: 502 });

    // Act
    const result = request('/leaderboard');

    // Assert
    await expect(result).rejects.toThrow(/^The server is currently unavailable\.$/);
  });

  test('a busy server that returns HTML still gives the player a retry message', async () => {
    // Arrange
    globalThis.fetch = async () => new Response('<h1>Proxy stack trace</h1>', { status: 503 });

    // Act
    const result = request('/leaderboard');

    // Assert
    await expect(result).rejects.toThrow(/^The server is busy right now\. Please try again shortly\.$/);
  });

  test('an unknown HTTP status with a JSON null body gives the player a generic retry message', async () => {
    // Arrange
    globalThis.fetch = async () => Response.json(null, { status: 599 });

    // Act
    const result = request('/leaderboard');

    // Assert
    await expect(result).rejects.toThrow(/^We couldn’t complete that action\. Please try again\.$/);
  });

  test('a network failure tells the player to check the connection', async () => {
    // Arrange
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };

    // Act
    const result = request('/leaderboard');

    // Assert
    await expect(result).rejects.toThrow(
      /^We couldn’t connect to the server\. Check your connection and try again\.$/,
    );
  });

  test('a request timeout tells the player that the server is taking too long', async () => {
    // Arrange
    globalThis.fetch = async () => {
      throw new DOMException('The request timed out', 'TimeoutError');
    };

    // Act
    const result = request('/leaderboard');

    // Assert
    await expect(result).rejects.toThrow(/^The server is taking too long to respond\.$/);
  });
});

describe('errorMessage', () => {
  test('an API error displays its public message even when it carries a server diagnostic', () => {
    // Arrange
    const error = new ApiError(502, 'Upstream server unavailable');

    // Act
    const message = errorMessage(error);

    // Assert
    expect(message).toBe('The server is currently unavailable.');
  });

  test('a connection error shows its recovery instructions to the player', () => {
    // Arrange
    const error = new Error('Check your connection and try again.');

    // Act
    const message = errorMessage(error);

    // Assert
    expect(message).toBe('Check your connection and try again.');
  });
});
