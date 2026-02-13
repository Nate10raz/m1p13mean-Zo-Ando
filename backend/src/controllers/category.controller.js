import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryTree,
  listCategories,
  seedCategories,
  updateCategory,
} from '../services/category.service.js';
import { apiResponse } from '../utils/response.util.js';

export const createCategoryController = async (req, res, next) => {
  try {
    const result = await createCategory(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Categorie creee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryTreeController = async (req, res, next) => {
  try {
    const result = await getCategoryTree({
      rootId: req.query.rootId,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Arborescence des categories',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listCategoriesController = async (req, res, next) => {
  try {
    const result = await listCategories({
      parentId: req.query.parentId,
      search: req.query.search,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des categories',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryController = async (req, res, next) => {
  try {
    const result = await getCategoryById(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Categorie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategoryController = async (req, res, next) => {
  try {
    const result = await updateCategory(req.params.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Categorie mise a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryController = async (req, res, next) => {
  try {
    const result = await deleteCategory(req.params.id, {
      force: req.query.force === true,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Categorie supprimee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const seedCategoriesController = async (req, res, next) => {
  try {
    const nodes = Array.isArray(req.body) ? req.body : req.body?.categories;
    const result = await seedCategories(nodes);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Categories inserees',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
