import React, { createContext, useContext, useState, useCallback } from "react";
import DeleteConfirmModal from "../components/ui/DeleteConfirmModal.jsx";

const DeleteGuardContext = createContext(null);

export const DeleteGuardProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    itemName: "",
    itemType: "",
    isSkippedAuth: false,
    pendingConfirm: null,
    pendingCancel: null,
  });

  const clearDeleteAuth = useCallback(() => {
    sessionStorage.removeItem("wd_delete_auth_until");
  }, []);

  const confirmDelete = useCallback(
    ({ itemName = "this item", itemType = "Item", onConfirm }) => {
      const authUntilStr = sessionStorage.getItem("wd_delete_auth_until");
      const authUntil = authUntilStr ? parseInt(authUntilStr, 10) : 0;
      const isSkippedAuth = Boolean(authUntil && Date.now() < authUntil);

      // Always open confirmation modal (with isSkippedAuth flag if password was recently verified)
      return new Promise((resolve) => {
        setModalState({
          isOpen: true,
          itemName,
          itemType,
          isSkippedAuth,
          pendingConfirm: () => {
            setModalState((prev) => ({ ...prev, isOpen: false }));
            if (typeof onConfirm === "function") {
              onConfirm();
            }
            resolve(true);
          },
          pendingCancel: () => {
            setModalState((prev) => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    [],
  );

  const handleModalConfirm = () => {
    if (modalState.pendingConfirm) {
      modalState.pendingConfirm();
    }
  };

  const handleModalCancel = () => {
    if (modalState.pendingCancel) {
      modalState.pendingCancel();
    }
  };

  return (
    <DeleteGuardContext.Provider value={{ confirmDelete, clearDeleteAuth }}>
      {children}
      <DeleteConfirmModal
        isOpen={modalState.isOpen}
        itemName={modalState.itemName}
        itemType={modalState.itemType}
        isSkippedAuth={modalState.isSkippedAuth}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </DeleteGuardContext.Provider>
  );
};

export const useDeleteGuard = () => {
  const context = useContext(DeleteGuardContext);
  if (!context) {
    throw new Error("useDeleteGuard must be used within a DeleteGuardProvider");
  }
  return context;
};
