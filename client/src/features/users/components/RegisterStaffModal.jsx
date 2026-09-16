import { useState } from "react";

import "./RegisterStaffModal.css";

import { createUser } from "../api/userApi";

import { useToast } from "../../../components/feedback/ToastContext";

function RegisterStaffModal({ onClose }) {
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    role: "",
    firstName: "",
    middleInitial: "",
    lastName: "",
    email: "",
    password: "",
    contactNumber: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setSubmitError("");

    try {
      await createUser(formData);

      showToast("Staff account created successfully", "success");

      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to create staff account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-staff-backdrop" onClick={onClose}>
      <div
        className="register-staff-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="register-staff-header">
          <h2>Register Staff</h2>

          <button type="button" onClick={onClose}>
            X
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Role
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="">Select role</option>
              <option value="VOLUNTEER">Volunteer</option>
              <option value="CARETAKER">Caretaker</option>
            </select>
          </label>
          <label>
            First name
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
            />
          </label>
          <label>
            Middle initial
            <input
              type="text"
              name="middleInitial"
              value={formData.middleInitial}
              onChange={handleChange}
            />
          </label>
          <label>
            Last name
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </label>
          <label>
            Contact number
            <input
              type="text"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Registering..." : "Register Staff"}
          </button>
          {submitError && <p className="form-error">{submitError}</p>}
        </form>
      </div>
    </div>
  );
}

export default RegisterStaffModal;
