// src/utils/api.js
import { authHeader } from "./authHeader";

// 🔹 GET request
export const apiGet = async (url) => {
  const headers = await authHeader();
  const response = await fetch(url, {
    method: "GET",
    headers,
  });
  return await response.json();
};

// 🔹 POST request
export const apiPost = async (url, body) => {
  const headers = await authHeader();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return await response.json();
};

// 🔹 Opcional: DELETE, PUT...
export const apiDelete = async (url) => {
  const headers = await authHeader();
  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });
  return await response.json();
};
