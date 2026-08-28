import { toast } from "react-toastify";

export const toastMessage = (message, type = "info") => {
  const options = {
    position: "top-right",
    autoClose: 3500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
  };

  if (typeof toast[type] === "function") {
    toast[type](message, options);
  } else {
    toast(message, options);
  }
};

export { toast };
