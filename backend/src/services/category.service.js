import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Produit from '../models/Produit.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeParentId = (parentId) => {
  if (parentId === undefined || parentId === null) return null;
  if (typeof parentId === 'string' && parentId.trim() === '') return null;
  return parentId;
};

const buildPath = (parent, selfId) => {
  if (parent) {
    const parentPath =
      Array.isArray(parent.chemin) && parent.chemin.length ? parent.chemin : [parent._id];
    return {
      chemin: [...parentPath, selfId],
      niveau: parentPath.length,
    };
  }
  return {
    chemin: [selfId],
    niveau: 0,
  };
};

const assertParentCanHaveChildren = async (parentId, session) => {
  if (!parentId) return;
  const product = await Produit.findOne({
    $or: [{ categorieId: parentId }, { sousCategoriesIds: parentId }],
  })
    .select('_id')
    .session(session || null);
  if (product) {
    throw createError(
      'Impossible de creer une sous-categorie car la categorie parente contient des produits',
      409,
    );
  }
};

const buildTree = (categories) => {
  const map = new Map();
  categories.forEach((category) => {
    map.set(category._id.toString(), { ...category, children: [] });
  });

  const roots = [];
  map.forEach((node) => {
    if (node.parentId) {
      const parent = map.get(node.parentId.toString());
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (node) => {
    node.children.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    node.children.forEach(sortChildren);
  };

  const markLeaf = (node) => {
    node.isLeaf = node.children.length === 0;
    node.children.forEach(markLeaf);
  };

  roots.forEach(sortChildren);
  roots.forEach(markLeaf);

  return roots;
};

export const createCategory = async (payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parentId = normalizeParentId(payload.parentId);
    let parent = null;

    if (parentId) {
      parent = await Category.findById(parentId).session(session);
      if (!parent) {
        throw createError('Categorie parente introuvable', 404);
      }
      await assertParentCanHaveChildren(parentId, session);
    }

    const category = new Category({
      nom: payload.nom,
      slug: payload.slug,
      description: payload.description,
      image: payload.image,
      icon: payload.icon,
      isActive: payload.isActive ?? true,
      parentId: parentId || null,
    });

    const { chemin, niveau } = buildPath(parent, category._id);
    category.chemin = chemin;
    category.niveau = niveau;

    await category.save({ session });
    await session.commitTransaction();

    return category.toObject();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getCategoryTree = async ({ rootId, search, page = 1, limit = 50 } = {}) => {
  const filter = { isActive: true };
  if (rootId) {
    filter.chemin = rootId;
  }

  if (!search) {
    const categories = await Category.find(filter).sort({ niveau: 1, nom: 1 }).lean();
    const tree = buildTree(categories);

    if (!rootId) return tree;
    const rootNode = tree.find((node) => node._id.toString() === rootId.toString());
    return rootNode || null;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
  const regex = new RegExp(escapeRegex(search), 'i');
  const matchFilter = {
    ...filter,
    nom: regex,
  };

  const matches = await Category.find(matchFilter)
    .sort({ nom: 1 })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit)
    .lean();

  if (!matches.length) {
    return rootId ? null : [];
  }

  const matchIds = matches.map((match) => match._id);
  const ancestorIds = new Set();
  const rootIdString = rootId ? rootId.toString() : null;

  for (const match of matches) {
    if (Array.isArray(match.chemin)) {
      let path = match.chemin;
      if (rootIdString) {
        const index = path.findIndex((id) => id.toString() === rootIdString);
        if (index >= 0) {
          path = path.slice(index);
        }
      }
      for (const id of path) {
        ancestorIds.add(id.toString());
      }
    } else {
      ancestorIds.add(match._id.toString());
    }
  }

  const descendants = await Category.find({ chemin: { $in: matchIds } }).lean();
  const descendantIdSet = new Set(descendants.map((node) => node._id.toString()));
  const missingAncestorIds = Array.from(ancestorIds).filter((id) => !descendantIdSet.has(id));
  const ancestors =
    missingAncestorIds.length > 0
      ? await Category.find({
          _id: { $in: missingAncestorIds.map((id) => new mongoose.Types.ObjectId(id)) },
        }).lean()
      : [];

  const tree = buildTree([...descendants, ...ancestors]);
  if (!rootId) return tree;
  return tree.find((node) => node._id.toString() === rootId.toString()) || null;
};

export const listCategories = async ({ parentId, search } = {}) => {
  const filter = { isActive: true };
  if (parentId !== undefined) {
    filter.parentId = normalizeParentId(parentId);
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ nom: regex }, { slug: regex }];
  }

  return Category.find(filter).sort({ niveau: 1, nom: 1 }).lean();
};

export const getCategoryById = async (categoryId) => {
  const category = await Category.findById(categoryId).lean();
  if (!category) {
    throw createError('Categorie introuvable', 404);
  }
  const hasChild = await Category.exists({ parentId: categoryId });
  return {
    ...category,
    isLeaf: !hasChild,
  };
};

export const updateCategory = async (categoryId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const category = await Category.findById(categoryId).session(session);
    if (!category) {
      throw createError('Categorie introuvable', 404);
    }

    const parentProvided = Object.prototype.hasOwnProperty.call(payload, 'parentId');
    const normalizedParentId = parentProvided ? normalizeParentId(payload.parentId) : undefined;
    const currentParentId = category.parentId ? category.parentId.toString() : null;
    const nextParentId = parentProvided
      ? normalizedParentId
        ? normalizedParentId.toString()
        : null
      : currentParentId;
    const parentChanged = parentProvided && nextParentId !== currentParentId;

    if (payload.nom !== undefined) category.nom = payload.nom;
    if (payload.slug !== undefined) category.slug = payload.slug;
    if (payload.description !== undefined) category.description = payload.description;
    if (payload.image !== undefined) category.image = payload.image;
    if (payload.icon !== undefined) category.icon = payload.icon;
    if (payload.isActive !== undefined) category.isActive = payload.isActive;

    if (parentChanged) {
      if (nextParentId && nextParentId === category._id.toString()) {
        throw createError('La categorie ne peut pas etre son propre parent', 400);
      }

      let parent = null;
      if (nextParentId) {
        parent = await Category.findById(nextParentId).session(session);
        if (!parent) {
          throw createError('Categorie parente introuvable', 404);
        }
        if (Array.isArray(parent.chemin) && parent.chemin.some((id) => id.equals(category._id))) {
          throw createError('Deplacement invalide: cycle detecte', 400);
        }
        await assertParentCanHaveChildren(nextParentId, session);
      }

      const { chemin: newPath, niveau: newLevel } = buildPath(parent, category._id);
      const descendants = await Category.find({
        chemin: category._id,
        _id: { $ne: category._id },
      }).session(session);

      category.parentId = nextParentId ? new mongoose.Types.ObjectId(nextParentId) : null;
      category.chemin = newPath;
      category.niveau = newLevel;
      await category.save({ session });

      if (descendants.length) {
        const bulkOps = descendants.map((descendant) => {
          const index = descendant.chemin.findIndex((id) => id.equals(category._id));
          const tail = index >= 0 ? descendant.chemin.slice(index + 1) : [];
          const updatedPath = [...newPath, ...tail];
          return {
            updateOne: {
              filter: { _id: descendant._id },
              update: {
                $set: {
                  chemin: updatedPath,
                  niveau: updatedPath.length - 1,
                },
              },
            },
          };
        });
        await Category.bulkWrite(bulkOps, { session });
      }
    } else {
      await category.save({ session });
    }

    await session.commitTransaction();
    return category.toObject();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteCategory = async (categoryId, { force = false } = {}) => {
  if (!force) {
    throw createError(
      'Suppression bloquee. Utilisez force=true pour confirmer la suppression.',
      400,
    );
  }

  const category = await Category.findById(categoryId).lean();
  if (!category) {
    throw createError('Categorie introuvable', 404);
  }

  const child = await Category.findOne({ parentId: categoryId }).select('_id').lean();
  if (child) {
    throw createError('Suppression impossible: categorie avec des sous-categories', 409);
  }

  const product = await Produit.findOne({
    $or: [{ categorieId: categoryId }, { sousCategoriesIds: categoryId }],
  })
    .select('_id')
    .lean();
  if (product) {
    throw createError('Suppression impossible: categorie liee a des produits', 409);
  }

  await Category.deleteOne({ _id: categoryId });
  return { deleted: true };
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureUniqueSlug = async (baseSlug, session) => {
  let slug = baseSlug;
  let counter = 1;
  while (await Category.exists({ slug }).session(session || null)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
};

const createNode = async (node, parent, session) => {
  if (!node || typeof node !== 'object') {
    throw createError('Noeud de categorie invalide', 400);
  }
  if (!node.nom || typeof node.nom !== 'string') {
    throw createError('Nom de categorie requis', 400);
  }

  if (parent) {
    await assertParentCanHaveChildren(parent._id, session);
  }

  const rawSlug = node.slug ? String(node.slug) : slugify(node.nom);
  if (!rawSlug) {
    throw createError('Slug invalide', 400);
  }
  const slug = await ensureUniqueSlug(rawSlug, session);

  const category = new Category({
    nom: node.nom,
    slug,
    description: node.description,
    image: node.image,
    icon: node.icon,
    isActive: node.isActive ?? true,
    parentId: parent ? parent._id : null,
  });

  const { chemin, niveau } = buildPath(parent, category._id);
  category.chemin = chemin;
  category.niveau = niveau;

  await category.save({ session });

  const children = Array.isArray(node.children) ? node.children : [];
  const createdChildren = [];
  for (const child of children) {
    const created = await createNode(child, category, session);
    createdChildren.push(created);
  }

  const created = category.toObject();
  created.children = createdChildren;
  return created;
};

export const seedCategories = async (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw createError('Liste de categories requise', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const createdRoots = [];
    for (const node of nodes) {
      const created = await createNode(node, null, session);
      createdRoots.push(created);
    }

    await session.commitTransaction();
    return {
      inserted: createdRoots.length,
      roots: createdRoots,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
