export interface Tag {
  id: string;
  userId: string;
  name: string;
  slug: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTag {
  id: string;
  projectId: string;
  tagId: string;
  createdAt: string;
  tag?: Tag; // Join relationship
}

export interface TagFormValues {
  name: string;
  color?: string;
}

export interface TagFilterOptions {
  search?: string;
  excludeTagIds?: string[];
}

export interface TagStats {
  totalTags: number;
  tagsUsedCount: number;
  mostUsedTags: Array<{
    tag: Tag;
    projectCount: number;
  }>;
}
