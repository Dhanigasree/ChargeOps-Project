import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { requestJson } from "../services/httpClient.js";

export const getUserProfile = async (_input = {}, context) => {
  if (!context.authorization) {
    return {
      needsAuthentication: true,
      message: "User profile requires the user's Authorization header."
    };
  }

  logger.info({ userId: context.userId }, "AI tool get_user_profile invoked");

  const payload = await requestJson({
    baseUrl: env.userServiceUrl,
    path: "/api/users/me",
    authorization: context.authorization
  });

  logger.info({ userId: context.userId }, "AI tool get_user_profile completed");

  return {
    profile: payload.data || null
  };
};
