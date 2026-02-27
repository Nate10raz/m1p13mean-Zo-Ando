import { getMyProfile, updateMyProfile } from '../services/user.service.js';
import { apiResponse } from '../utils/response.util.js';

export const getMyProfileController = async (req, res, next) => {
  try {
    const result = await getMyProfile(req.user?.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Profil utilisateur',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfileController = async (req, res, next) => {
  try {
    const result = await updateMyProfile(req.user?.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Profil utilisateur mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
