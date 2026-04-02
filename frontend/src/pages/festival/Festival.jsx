import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  useGetFestivalsQuery,
  useCreateFestivalMutation,
  useUpdateFestivalMutation,
  useDeleteFestivalMutation,
} from "../../features/festival/festivalApi.js";
import Button from "../../components/ui/Button.jsx";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Modal.jsx";

const FestivalSchedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalForm, setModalForm] = useState({
    festival_name: "",
    schedule_date: "",
  });
  const filterRef = useRef(null);

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useGetFestivalsQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
  });

  const [createFestival] = useCreateFestivalMutation();
  const [updateFestival] = useUpdateFestivalMutation();
  const [deleteFestival] = useDeleteFestivalMutation();

  const schedules = response?.data?.schedules || [];
  const pagination = response?.data?.pagination || {};

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFilter = () => {
    setShowFilters(!showFilters);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleOpenModal = (festival = null) => {
    if (festival) {
      setEditingId(festival._id);
      setModalForm({
        festival_name: festival.festival_name,
        schedule_date: festival.schedule_date.split("T")[0],
      });
    } else {
      setEditingId(null);
      setModalForm({ festival_name: "", schedule_date: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setModalForm({ festival_name: "", schedule_date: "" });
  };

  const handleSave = async () => {
    if (!modalForm.festival_name || !modalForm.schedule_date) {
      alert("Please fill all fields");
      return;
    }

    try {
      if (editingId) {
        await updateFestival({
          id: editingId,
          ...modalForm,
        }).unwrap();
      } else {
        await createFestival(modalForm).unwrap();
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving festival:", error);
      alert("Failed to save festival schedule");
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this festival schedule?")
    ) {
      return;
    }

    try {
      await deleteFestival(id).unwrap();
    } catch (error) {
      console.error("Error deleting festival:", error);
      alert("Failed to delete festival schedule");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    try {
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header and Search */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={toggleFilter}
                className="flex items-center justify-center bg-blue-100 rounded-md p-2 hover:bg-blue-200 transition-colors"
              >
                <Filter className="h-5 w-5 text-blue-600" />
              </button>
              {showFilters && (
                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-10 w-64">
                  <div className="text-sm text-gray-600 font-medium mb-3">
                    Filter festivals
                  </div>
                  <p className="text-xs text-gray-500">
                    Use search bar above to filter by festival name
                  </p>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-3 border border-gray-300 bg-white rounded-full px-4 py-2 max-w-xs shadow-sm">
              <Search className="h-5 w-5 text-gray-500" />
              <input
                placeholder="Search festivals..."
                className="bg-transparent focus:outline-none text-gray-600 placeholder-gray-400 w-full text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Festival
          </button>
        </div>

        {/* Festival List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {error ? (
            <div className="p-6 text-center">
              <div className="text-red-600 mb-4">
                Failed to load festival schedules. Please try again.
              </div>
              <Button onClick={refetch}>Retry</Button>
            </div>
          ) : !schedules?.length ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No festivals found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? "No festivals match your search."
                  : "Get started by adding your first festival schedule."}
              </p>
              <Button onClick={() => handleOpenModal()}>
                Add First Festival
              </Button>
            </div>
          ) : (
            <div>
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-4 gap-4 text-gray-500 text-sm font-semibold bg-gray-200 p-4 rounded-t-lg">
                <div>S No.</div>
                <div>Festival Name</div>
                <div>Schedule Date</div>
                <div>Actions</div>
              </div>

              {/* Festival Rows */}
              {schedules.map((festival, index) => (
                <div
                  key={festival._id}
                  className={`${
                    index !== schedules.length - 1 ? "border-b" : ""
                  } border-gray-200`}
                >
                  <div className="hidden md:grid grid-cols-4 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                    <div className="text-sm text-gray-900 font-medium">
                      {index+1 + (pagination.page - 1) * pagination.limit}
                    </div>
                    <div className="text-sm text-blue-900  font-bold font-xl">
                      {festival.festival_name}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(festival.schedule_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(festival)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(festival._id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden p-4 space-y-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {festival.festival_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(festival.schedule_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(festival)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(festival._id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} festivals
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: pagination.pages },
                      (_, i) => i + 1,
                    ).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${
                          pageNum === pagination.page
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {pagination.pages <= 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500 text-center">
                Showing {pagination.total || 0} of {pagination.total || 0}{" "}
                festivals
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md">
        <DialogHeader>
          {editingId ? "Edit Festival" : "Add Festival"}
        </DialogHeader>
        <DialogBody>
          <div className=" space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Festival Name (Hindi)
              </label>
              <input
                type="text"
                value={modalForm.festival_name}
                onChange={(e) =>
                  setModalForm({
                    ...modalForm,
                    festival_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g., Diwali, Holi, Christmas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Date
              </label>
              <input
                type="date"
                value={modalForm.schedule_date}
                onChange={(e) =>
                  setModalForm({
                    ...modalForm,
                    schedule_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <div className="flex items-center justify-end gap-2  border-t border-gray-200">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            >
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default FestivalSchedule;
