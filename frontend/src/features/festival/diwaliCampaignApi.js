import { baseApi } from "../../services/baseApi.js";

const api = baseApi.injectEndpoints({
  endpoints: builder => ({
    getDiwaliCampaign: builder.query({
      query: ({ page, status }) => `/diwali-campaign?page=${page}&status=${encodeURIComponent(status)}`,
    }),
    getDiwaliAttempts: builder.query({
      query: recipientId => `/diwali-campaign/attempts/${encodeURIComponent(recipientId)}`,
    }),
    diwaliAction: builder.mutation({
      query: ({ action, body = {} }) => ({ url: `/diwali-campaign/${action}`, method: "POST", body }),
    }),
  }),
});

export const { useGetDiwaliCampaignQuery, useGetDiwaliAttemptsQuery, useDiwaliActionMutation } = api;
