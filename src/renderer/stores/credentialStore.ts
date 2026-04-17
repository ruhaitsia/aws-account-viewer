import { create } from 'zustand';
import type { AWSProfile, ManualCredentialInput } from '../../shared/types';

interface ValidationError {
  type: string;
  message: string;
  suggestion: string;
}

interface CredentialState {
  profiles: AWSProfile[];
  activeProfile: AWSProfile | null;
  credentialStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  accountId: string | null;
  accountAlias: string | null;
  validationError: ValidationError | null;

  loadProfiles: () => Promise<void>;
  selectProfile: (profile: AWSProfile) => Promise<void>;
  validateProfile: (profile: AWSProfile) => Promise<void>;
  setManualCredential: (input: ManualCredentialInput) => Promise<void>;
}

export const useCredentialStore = create<CredentialState>((set) => ({
  profiles: [],
  activeProfile: null,
  credentialStatus: 'idle',
  accountId: null,
  accountAlias: null,
  validationError: null,

  loadProfiles: async () => {
    try {
      const profiles = await window.electronAPI.credential.loadProfiles();
      set({ profiles });
    } catch {
      set({ profiles: [] });
    }
  },

  selectProfile: async (profile: AWSProfile) => {
    set({
      activeProfile: profile,
      credentialStatus: 'validating',
      validationError: null,
      accountId: null,
      accountAlias: null,
    });
    try {
      const result = await window.electronAPI.credential.validate(profile);
      if (result.valid) {
        set({
          credentialStatus: 'valid',
          accountId: result.accountId ?? null,
          accountAlias: result.accountAlias ?? null,
          validationError: null,
        });
      } else {
        set({
          credentialStatus: 'invalid',
          validationError: result.error ?? null,
        });
      }
    } catch {
      set({
        credentialStatus: 'invalid',
        validationError: {
          type: 'UnknownError',
          message: '验证过程中发生未知错误',
          suggestion: '请检查网络连接后重试',
        },
      });
    }
  },

  validateProfile: async (profile: AWSProfile) => {
    set({
      activeProfile: profile,
      credentialStatus: 'validating',
      validationError: null,
      accountId: null,
      accountAlias: null,
    });
    try {
      const result = await window.electronAPI.credential.validate(profile);
      if (result.valid) {
        set({
          credentialStatus: 'valid',
          accountId: result.accountId ?? null,
          accountAlias: result.accountAlias ?? null,
          validationError: null,
        });
      } else {
        set({
          credentialStatus: 'invalid',
          validationError: result.error ?? null,
        });
      }
    } catch {
      set({
        credentialStatus: 'invalid',
        validationError: {
          type: 'UnknownError',
          message: '验证过程中发生未知错误',
          suggestion: '请检查网络连接后重试',
        },
      });
    }
  },

  setManualCredential: async (input: ManualCredentialInput) => {
    set({
      credentialStatus: 'validating',
      validationError: null,
      accountId: null,
      accountAlias: null,
      activeProfile: {
        name: 'manual',
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
        region: input.region,
        source: 'manual',
      },
    });
    try {
      const result = await window.electronAPI.credential.setManual(input);
      if (result.valid) {
        set({
          credentialStatus: 'valid',
          accountId: result.accountId ?? null,
          accountAlias: result.accountAlias ?? null,
          validationError: null,
        });
      } else {
        set({
          credentialStatus: 'invalid',
          validationError: result.error ?? null,
        });
      }
    } catch {
      set({
        credentialStatus: 'invalid',
        validationError: {
          type: 'UnknownError',
          message: '验证过程中发生未知错误',
          suggestion: '请检查网络连接后重试',
        },
      });
    }
  },
}));
