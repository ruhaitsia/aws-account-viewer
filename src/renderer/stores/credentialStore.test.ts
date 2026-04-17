import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCredentialStore } from './credentialStore';
import type { AWSProfile, CredentialValidationResult, ManualCredentialInput } from '../../shared/types';

// Mock window.electronAPI
const mockLoadProfiles = vi.fn<() => Promise<AWSProfile[]>>();
const mockValidate = vi.fn<(profile: AWSProfile) => Promise<CredentialValidationResult>>();
const mockSetManual = vi.fn<(input: ManualCredentialInput) => Promise<CredentialValidationResult>>();

vi.stubGlobal('window', {
  electronAPI: {
    credential: {
      loadProfiles: mockLoadProfiles,
      validate: mockValidate,
      setManual: mockSetManual,
    },
  },
});

describe('credentialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useCredentialStore.setState({
      profiles: [],
      activeProfile: null,
      credentialStatus: 'idle',
      accountId: null,
      accountAlias: null,
      validationError: null,
    });
  });

  describe('loadProfiles', () => {
    it('should load profiles from electronAPI', async () => {
      const profiles: AWSProfile[] = [
        { name: 'default', region: 'us-east-1', source: 'file' },
        { name: 'prod', region: 'eu-west-1', source: 'file' },
      ];
      mockLoadProfiles.mockResolvedValue(profiles);

      await useCredentialStore.getState().loadProfiles();

      expect(mockLoadProfiles).toHaveBeenCalledOnce();
      expect(useCredentialStore.getState().profiles).toEqual(profiles);
    });

    it('should set empty profiles on error', async () => {
      mockLoadProfiles.mockRejectedValue(new Error('fail'));

      await useCredentialStore.getState().loadProfiles();

      expect(useCredentialStore.getState().profiles).toEqual([]);
    });
  });

  describe('selectProfile', () => {
    it('should validate and set valid credential', async () => {
      const profile: AWSProfile = { name: 'default', region: 'us-east-1', source: 'file' };
      mockValidate.mockResolvedValue({
        valid: true,
        accountId: '123456789012',
        accountAlias: 'my-account',
      });

      await useCredentialStore.getState().selectProfile(profile);

      const state = useCredentialStore.getState();
      expect(state.credentialStatus).toBe('valid');
      expect(state.accountId).toBe('123456789012');
      expect(state.accountAlias).toBe('my-account');
      expect(state.activeProfile).toEqual(profile);
      expect(state.validationError).toBeNull();
    });

    it('should handle invalid credential', async () => {
      const profile: AWSProfile = { name: 'bad', source: 'file' };
      mockValidate.mockResolvedValue({
        valid: false,
        error: {
          type: 'InvalidClientTokenId',
          message: 'Access Key ID 无效',
          suggestion: '请检查 Access Key ID',
        },
      });

      await useCredentialStore.getState().selectProfile(profile);

      const state = useCredentialStore.getState();
      expect(state.credentialStatus).toBe('invalid');
      expect(state.validationError).toEqual({
        type: 'InvalidClientTokenId',
        message: 'Access Key ID 无效',
        suggestion: '请检查 Access Key ID',
      });
    });

    it('should handle unexpected errors', async () => {
      const profile: AWSProfile = { name: 'default', source: 'file' };
      mockValidate.mockRejectedValue(new Error('network error'));

      await useCredentialStore.getState().selectProfile(profile);

      const state = useCredentialStore.getState();
      expect(state.credentialStatus).toBe('invalid');
      expect(state.validationError?.type).toBe('UnknownError');
    });
  });

  describe('setManualCredential', () => {
    it('should validate manual credentials successfully', async () => {
      mockSetManual.mockResolvedValue({
        valid: true,
        accountId: '987654321098',
        accountAlias: 'manual-account',
      });

      await useCredentialStore.getState().setManualCredential({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2',
      });

      const state = useCredentialStore.getState();
      expect(state.credentialStatus).toBe('valid');
      expect(state.accountId).toBe('987654321098');
      expect(state.activeProfile?.source).toBe('manual');
      expect(state.activeProfile?.name).toBe('manual');
    });

    it('should handle manual credential validation failure', async () => {
      mockSetManual.mockResolvedValue({
        valid: false,
        error: {
          type: 'SignatureDoesNotMatch',
          message: 'Secret Access Key 不匹配',
          suggestion: '请检查 Secret Access Key 是否正确',
        },
      });

      await useCredentialStore.getState().setManualCredential({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wrong-key',
        region: 'us-west-2',
      });

      const state = useCredentialStore.getState();
      expect(state.credentialStatus).toBe('invalid');
      expect(state.validationError?.type).toBe('SignatureDoesNotMatch');
    });
  });
});
