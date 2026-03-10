import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedSchedule: null,
  filters: {
    status: "",
    date_from: "",
    date_to: "",
    technician: "",
  },
  dashboardStats: null,
  isCreatingServicePlan: false,
  isCreatingServiceVisit: false,
};

const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {
    setSelectedSchedule: (state, action) => {
      state.selectedSchedule = action.payload;
    },
    clearSelectedSchedule: (state) => {
      state.selectedSchedule = null;
    },
    setServiceFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetServiceFilters: (state) => {
      state.filters = initialState.filters;
    },
    setDashboardStats: (state, action) => {
      state.dashboardStats = action.payload;
    },
    setCreatingServicePlan: (state, action) => {
      state.isCreatingServicePlan = action.payload;
    },
    setCreatingServiceVisit: (state, action) => {
      state.isCreatingServiceVisit = action.payload;
    },
  },
});

export const {
  setSelectedSchedule,
  clearSelectedSchedule,
  setServiceFilters,
  resetServiceFilters,
  setDashboardStats,
  setCreatingServicePlan,
  setCreatingServiceVisit,
} = serviceSlice.actions;

// Selectors
export const selectSelectedSchedule = (state) => state.service.selectedSchedule;
export const selectServiceFilters = (state) => state.service.filters;
export const selectDashboardStats = (state) => state.service.dashboardStats;
export const selectIsCreatingServicePlan = (state) =>
  state.service.isCreatingServicePlan;
export const selectIsCreatingServiceVisit = (state) =>
  state.service.isCreatingServiceVisit;

export default serviceSlice.reducer;
