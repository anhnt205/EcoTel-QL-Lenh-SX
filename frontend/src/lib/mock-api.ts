import axios from 'axios';
import api from './axios';
import MockAdapter from 'axios-mock-adapter';
import { MOCK_INIT_DATA, MOCK_STATISTICS_ROWS, MOCK_USERS } from './mock-data';

let isMockSetup = false;

export function setupMockApi() {
  if (isMockSetup) return;
  isMockSetup = true;

  const mockAdapters = [
    new MockAdapter(axios, { delayResponse: 300 }),
    new MockAdapter(api, { delayResponse: 300 }),
  ];

  mockAdapters.forEach((mock) => {
    // ─── Auth ─────────────────────────────────────────────────────────
    mock.onPost(/\/v1\/auth\/login/).reply((config) => {
      const { username, password } = JSON.parse(config.data || '{}');
      const user = MOCK_USERS.find((u) => u.username === username);
      if (user && password === '123456') {
        return [
          200,
          {
            success: true,
            result: {
              accessToken: 'mock-access-token-' + Date.now(),
              refreshToken: 'mock-refresh-token-' + Date.now(),
              refreshTokenExpiryTime: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ).toISOString(),
              user,
            },
          },
        ];
      }
      return [401, { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' }];
    });

    mock.onGet(/\/v1\/auth\/me/).reply((config) => {
      const token = config.headers?.Authorization;
      if (!token) return [401, { success: false }];
      return [200, { success: true, result: MOCK_USERS[0] }];
    });

    mock.onPost(/\/v1\/auth\/refresh-token/).reply(200, {
      success: true,
      result: {
        accessToken: 'mock-refreshed-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        refreshTokenExpiryTime: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });



    // ─── Statistics ───────────────────────────────────────────────────
    mock.onGet(/\/v1\/statistics\/init-data/).reply(200, {
      success: true,
      result: MOCK_INIT_DATA,
    });

    mock.onGet(/\/v1\/statistics\/list/).reply((config) => {
      const { page = 1, limit = 20, vehicleSource } = config.params || {};
      let filtered = [...MOCK_STATISTICS_ROWS];
      if (vehicleSource)
        filtered = filtered.filter((r) => r.vehicleSource === vehicleSource);

      return [
        200,
        {
          success: true,
          result: {
            data: filtered.slice((page - 1) * limit, page * limit),
            totalItems: filtered.length,
            totalPages: Math.ceil(filtered.length / limit),
            currentPage: page,
          },
        },
      ];
    });

    mock.onPost(/\/v1\/statistics\/batch-save/).reply(200, {
      success: true,
      result: { _id: 'new-report' },
    });

    mock.onPut(/\/v1\/statistics\/batch-update\/.*/).reply(200, {
      success: true,
    });

    mock.onDelete(/\/v1\/statistics\/batch-delete/).reply(200, { success: true });

    mock.onPost(/\/v1\/statistics\/export/).reply(200, new Blob(['mock excel']), {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    mock.onPost(/\/v1\/statistics\/import/).reply(200, { success: true });

    // ─── Catch all other requests ─────────────────────────────────────
    mock.onAny().passThrough();
  });

  console.log('[Mock API] Đã bật mock API — dữ liệu giả lập sẵn sàng!');
}
