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
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Clock,
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

const FESTIVAL_PRESETS = [
  {
    key: "navratri_wish",
    name: "नवरात्रि",
    label: "1. नवरात्रि (navratri_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को नवरात्रि की हार्दिक शुभकामनाएं! ✨\n\nमाँ दुर्गा से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nशक्ति, खुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "pushyanakshatra_wish",
    name: "पुष्य नक्षत्र",
    label: "2. पुष्य नक्षत्र (pushyanakshatra_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को शुभ पुष्य नक्षत्र की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि इस शुभ दिन की गई खरीदारी आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "dussehra_wish",
    name: "दशहरा",
    label: "3. दशहरा (dussehra_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को विजयादशमी (दशहरा) की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि बुराई पर अच्छाई की जीत का यह पावन पर्व आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "dhanteras_wish",
    name: "धनतेरस",
    label: "4. धनतेरस (dhanteras_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को धनतेरस की हार्दिक शुभकामनाएं! ✨\n\nमाँ लक्ष्मी और भगवान धन्वंतरि से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और अच्छा स्वास्थ्य लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "diwali_wish",
    name: "दीपावली",
    label: "5. दीपावली (diwali_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को दीपावली की हार्दिक शुभकामनाएं! ✨\n\nमाँ लक्ष्मी और भगवान गणेश से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "govardhan_wish",
    name: "गोवर्धन पूजा",
    label: "6. गोवर्धन पूजा (govardhan_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को गोवर्धन पूजा की हार्दिक शुभकामनाएं! ✨\n\nभगवान श्रीकृष्ण से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "bhaidooj_wish",
    name: "भाई दूज",
    label: "7. भाई दूज (bhaidooj_wish)",
    preview: `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को भाई दूज की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि भाई-बहन का यह पावन प्रेम आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
  {
    key: "festival_wish",
    name: "",
    label: "अन्य / Custom Festival Template (festival_wish)",
    preview: `नमस्ते {{Customer Name}} जी 😊\n\n✨ आपको और आपके परिवार को {{Festival Name}} की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n{{Shop Name}} की ओर से`,
  },
];

const FestivalSchedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalForm, setModalForm] = useState({
    festival_name: "",
    template_name: "navratri_wish",
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
    limit,
    search: searchTerm,
  });

  const [createFestival, { isLoading: isCreating }] = useCreateFestivalMutation();
  const [updateFestival, { isLoading: isUpdating }] = useUpdateFestivalMutation();
  const [deleteFestival] = useDeleteFestivalMutation();

  const isSaving = isCreating || isUpdating;

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
        template_name: festival.template_name || "festival_wish",
        schedule_date: festival.schedule_date ? festival.schedule_date.split("T")[0] : "",
      });
    } else {
      setEditingId(null);
      const defaultPreset = FESTIVAL_PRESETS[0];
      setModalForm({
        festival_name: defaultPreset.name,
        template_name: defaultPreset.key,
        schedule_date: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setShowModal(false);
    setEditingId(null);
    setModalForm({ festival_name: "", template_name: "navratri_wish", schedule_date: "" });
  };

  const handlePresetChange = (e) => {
    const selectedKey = e.target.value;
    const preset = FESTIVAL_PRESETS.find((p) => p.key === selectedKey);
    setModalForm((prev) => ({
      ...prev,
      template_name: selectedKey,
      festival_name: preset && preset.name ? preset.name : prev.festival_name,
    }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!modalForm.festival_name || !modalForm.schedule_date) {
      alert("Please fill all required fields");
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
    } catch (err) {
      console.error("Error saving festival:", err);
      alert(err?.data?.message || err?.message || "Failed to save festival schedule");
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

  const selectedPreset =
    FESTIVAL_PRESETS.find((p) => p.key === modalForm.template_name) ||
    FESTIVAL_PRESETS[FESTIVAL_PRESETS.length - 1];

  const getTemplateBadge = (templateKey) => {
    const preset = FESTIVAL_PRESETS.find((p) => p.key === templateKey);
    if (preset && preset.key !== "festival_wish") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Sparkles className="w-3 h-3" />
          {preset.name} Template
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
        <MessageSquare className="w-3 h-3" />
        Standard Template
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header and Search */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6 gap-4">
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
                <div className="absolute top-12 left-0 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-md shadow-lg p-4 z-10 w-64">
                  <div className="text-sm text-gray-600 font-medium mb-3">
                    Filter festivals
                  </div>
                  <p className="text-xs text-ink-muted dark:text-slate-500">
                    Use search bar to filter by festival name
                  </p>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-2 max-w-xs shadow-sm">
              <Search className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              <input
                placeholder="Search festivals..."
                className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-sm"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Festival Schedule
          </button>
        </div>

        {/* Festival List */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
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
              <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                No festivals scheduled
              </h3>
              <p className="text-ink-secondary dark:text-slate-400 mb-6">
                {searchTerm
                  ? "No festivals match your search."
                  : "Select a festival template and schedule wishes for your customers."}
              </p>
              <Button onClick={() => handleOpenModal()}>
                Add First Festival Schedule
              </Button>
            </div>
          ) : (
            <div>
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-6 gap-4 text-gray-500 dark:text-slate-400 text-sm font-semibold bg-gray-100 dark:bg-dark-subtle p-4 rounded-t-lg">
                <div>S No.</div>
                <div className="col-span-2">Festival Name & Template</div>
                <div>Schedule Date</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Festival Rows */}
              {schedules.map((festival, index) => (
                <div
                  key={festival._id}
                  className={`${
                    index !== schedules.length - 1 ? "border-b" : ""
                  } border-gray-200 dark:border-dark-border`}
                >
                  <div className="hidden md:grid grid-cols-6 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-dark-subtle/50 transition-colors">
                    <div className="text-sm text-gray-900 dark:text-slate-200 font-medium">
                      {index + 1 + (pagination.page - 1) * pagination.limit}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <div className="text-sm text-blue-900 dark:text-blue-400 font-bold">
                        {festival.festival_name}
                      </div>
                      <div>{getTemplateBadge(festival.template_name)}</div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(festival.schedule_date)}
                    </div>
                    <div>
                      {festival.status === "Completed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Sent ({festival.festival_wishes_sent || 0})
                        </span>
                      ) : festival.status === "Processing" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          Processing ({festival.festival_wishes_sent || 0})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(festival)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(festival._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden p-4 space-y-3 hover:bg-gray-50 dark:hover:bg-dark-subtle/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {festival.festival_name}
                        </p>
                        <div>{getTemplateBadge(festival.template_name)}</div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 pt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(festival.schedule_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(festival)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(festival._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
          {pagination.total > 0 && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input rounded-b-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs sm:text-sm text-ink-muted dark:text-slate-400">
                  <span>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{" "}
                    of {pagination.total} festivals
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows per page:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {pagination.pages > 1 && (
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
                          className={`px-3 py-1 rounded text-xs sm:text-sm ${
                            pageNum === pagination.page
                              ? "bg-blue-500 text-white"
                              : "bg-white dark:bg-dark-card text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-subtle"
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md">
        <DialogHeader>
          {editingId ? "Edit Festival Schedule" : "Add Festival Schedule"}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Festival Preset Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                Select Festival / Template
              </label>
              <select
                value={modalForm.template_name}
                onChange={handlePresetChange}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-input text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
              >
                {FESTIVAL_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Festival Name (Hindi / Custom) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                Festival Name
              </label>
              <input
                type="text"
                disabled={isSaving}
                value={modalForm.festival_name}
                onChange={(e) =>
                  setModalForm({
                    ...modalForm,
                    festival_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-input text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                placeholder="e.g. नवरात्रि, धनतेरस, दीपावली"
              />
            </div>

            {/* Schedule Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                Schedule Date
              </label>
              <input
                type="date"
                disabled={isSaving}
                value={modalForm.schedule_date}
                onChange={(e) =>
                  setModalForm({
                    ...modalForm,
                    schedule_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-input text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
            </div>

            {/* Template WhatsApp Live Preview */}
            <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Template Message Preview ({modalForm.template_name})
                </span>
              </div>
              <div className="whitespace-pre-wrap font-sans text-xs text-emerald-950 dark:text-emerald-100 bg-white dark:bg-dark-card p-3 rounded border border-emerald-100 dark:border-emerald-900 leading-relaxed shadow-inner">
                {selectedPreset?.preview}
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-dark-border pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCloseModal}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
            >
              {editingId ? "Update Schedule" : "Create Schedule"}
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default FestivalSchedule;
