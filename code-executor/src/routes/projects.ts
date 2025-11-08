import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Project from '../models/Project';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * GET /api/projects
 * Get all projects for authenticated user
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select('-files.content'); // Exclude file content for list view

    res.json({ projects });
  } catch (error: any) {
    logger.error('Failed to fetch projects', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error: any) {
    logger.error('Failed to fetch project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, language, files } = req.body;

    if (!name || !language) {
      return res.status(400).json({ error: 'Name and language are required' });
    }

    const project = await Project.create({
      userId: req.userId,
      name,
      description,
      language,
      files: files || [],
    });

    logger.info('Project created', { projectId: project._id, userId: req.userId });

    res.status(201).json({ project });
  } catch (error: any) {
    logger.error('Failed to create project', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, language, files } = req.body;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      {
        name,
        description,
        language,
        files,
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info('Project updated', { projectId: project._id, userId: req.userId });

    res.json({ project });
  } catch (error: any) {
    logger.error('Failed to update project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info('Project deleted', { projectId: project._id, userId: req.userId });

    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * POST /api/projects/:id/files
 * Add or update a file in a project
 */
router.post('/:id/files', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { path, content, language } = req.body;

    if (!path || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if file exists
    const fileIndex = project.files.findIndex((f) => f.path === path);

    if (fileIndex >= 0) {
      // Update existing file
      project.files[fileIndex].content = content;
      project.files[fileIndex].language = language || project.files[fileIndex].language;
      project.files[fileIndex].lastModified = new Date();
    } else {
      // Add new file
      project.files.push({
        name: path.split('/').pop() || path,
        path,
        content,
        language: language || project.language,
        lastModified: new Date(),
      });
    }

    await project.save();

    res.json({ project });
  } catch (error: any) {
    logger.error('Failed to update file', { error: error.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to update file' });
  }
});

export default router;
