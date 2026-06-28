import { type User, type InsertUser, type Location, type InsertLocation, type Media, type InsertMedia, type Setting, type InsertSetting, type Category, type InsertCategory, type Product, type InsertProduct, type AuditLog, type InsertAuditLog, users, locations, media, settings, categories, products, auditLogs } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `product-${Date.now()}`;
}

function productInputToRow(input: InsertProduct, id: string, existing?: Product): Product {
  const now = new Date().toISOString();
  return {
    id,
    title: input.title ?? existing?.title ?? "",
    handle: input.handle || existing?.handle || slugify(input.title ?? existing?.title ?? ""),
    category: input.category ?? existing?.category ?? "Toys",
    description: input.description ?? existing?.description ?? "",
    price: input.price ?? existing?.price ?? "0.00",
    compareAtPrice: input.compareAtPrice ?? existing?.compareAtPrice ?? "",
    inventory: input.inventory ?? existing?.inventory ?? 0,
    status: input.status ?? existing?.status ?? "active",
    imageUrl: input.imageUrl ?? existing?.imageUrl ?? "",
    imageUrls: input.imageUrls ?? existing?.imageUrls ?? "[]",
    ageRange: input.ageRange ?? existing?.ageRange ?? "",
    material: input.material ?? existing?.material ?? "",
    variants: input.variants ?? existing?.variants ?? "{}",
    tags: input.tags ?? existing?.tags ?? "",
    sku: input.sku ?? existing?.sku ?? "",
    featured: input.featured ?? existing?.featured ?? "false",
    seoTitle: input.seoTitle ?? existing?.seoTitle ?? "",
    seoDescription: input.seoDescription ?? existing?.seoDescription ?? "",
    focusKeyword: input.focusKeyword ?? existing?.focusKeyword ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, newPassword: string, byUserId?: string): Promise<boolean>;
  recordFailedLogin(userId: string): Promise<boolean>;
  resetFailedLogins(userId: string): Promise<boolean>;
  lockUser(userId: string): Promise<boolean>;
  unlockUser(userId: string): Promise<boolean>;
  setMustChangePassword(userId: string): Promise<boolean>;
  
  // Location methods
  getAllLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: string): Promise<boolean>;
  toggleBookmark(id: string): Promise<Location | undefined>;
  
  // Media methods
  getAllMedia(): Promise<Media[]>;
  getMedia(id: string): Promise<Media | undefined>;
  createMedia(media: InsertMedia): Promise<Media>;
  updateMedia(id: string, updates: Partial<InsertMedia>): Promise<Media | undefined>;
  deleteMedia(id: string): Promise<boolean>;
  
  // Settings methods
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
  
  // Category methods
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Product methods
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByHandle(handle: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private locations: Map<string, Location>;
  private media: Map<string, Media>;
  private settings: Map<string, Setting>;
  private categories: Map<string, Category>;
  private products: Map<string, Product>;
  private auditLogs: Map<string, AuditLog>;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.media = new Map();
    this.settings = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.auditLogs = new Map();
    this.seedDefaultAdmin();
    this.seedDefaultCategories();
    this.seedMockLocations();
  }

  // Seed default admin account (only if INIT_ADMIN_USERNAME env var is set)
  private async seedDefaultAdmin() {
    const adminUsername = process.env.INIT_ADMIN_USERNAME;
    const adminPassword = process.env.INIT_ADMIN_PASSWORD;
    
    if (adminUsername && adminPassword) {
      const existingAdmin = await this.getUserByUsername(adminUsername);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await this.createUser({
          username: adminUsername,
          password: hashedPassword,
          role: "admin",
        });
        console.log(`✓ Admin account created: ${adminUsername}`);
      }
    }
  }

  // Seed default categories
  private seedDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      {
        name: "Muffler Men",
        slug: "muffler-men",
        description: "Giant fiberglass figures that once adorned muffler shops and gas stations",
        icon: "🗿",
        color: "#ef4444",
        displayOrder: 1,
      },
      {
        name: "World's Largest",
        slug: "worlds-largest",
        description: "Colossal monuments to American roadside excess",
        icon: "🎪",
        color: "#3b82f6",
        displayOrder: 2,
      },
      {
        name: "Unique Finds",
        slug: "unique-finds",
        description: "Peculiar treasures and oddities that defy categorization",
        icon: "✨",
        color: "#8b5cf6",
        displayOrder: 3,
      },
    ];

    defaultCategories.forEach((cat) => {
      const id = randomUUID();
      const now = new Date().toISOString();
      this.categories.set(id, {
        id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? "",
        icon: cat.icon ?? "📍",
        color: cat.color ?? "#f97316",
        displayOrder: cat.displayOrder ?? 0,
        backgroundImageUrl: cat.backgroundImageUrl ?? "",
        overlayColor: cat.overlayColor ?? "#000000",
        overlayOpacity: cat.overlayOpacity ?? "0.5",
        textColor: cat.textColor ?? "#ffffff",
        customIconUrl: cat.customIconUrl ?? "",
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  // Seed mock locations (without images - to be uploaded by user and stored in database)
  private seedMockLocations() {
    const mockLocations: InsertLocation[] = [
      {
        name: "Giant Muffler Man - Wilmington",
        latitude: 41.3083,
        longitude: -88.1467,
        category: "muffler-men",
        state: "Illinois",
        city: "Wilmington",
        zipCode: "60481",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-06-15",
        customFields: JSON.stringify({ material: "fiberglass", height: "28 feet" }),
      },
      {
        name: "World's Largest Ball of Twine",
        latitude: 39.2026,
        longitude: -98.4842,
        category: "worlds-largest",
        state: "Kansas",
        city: "Cawker City",
        zipCode: "67430",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-07-20",
        customFields: JSON.stringify({ weight: "17,400 pounds", creator: "Frank Stoeber" }),
      },
      {
        name: "Cowboy Muffler Man",
        latitude: 32.7767,
        longitude: -96.7970,
        category: "muffler-men",
        state: "Texas",
        city: "Dallas",
        zipCode: "75201",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-08-10",
        customFields: JSON.stringify({ style: "western", accessories: "hat and boots" }),
      },
      {
        name: "World's Largest Thermometer",
        latitude: 35.5944,
        longitude: -116.0733,
        category: "worlds-largest",
        state: "California",
        city: "Baker",
        zipCode: "92309",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-05-12",
        customFields: JSON.stringify({ height: "134 feet", location: "Baker" }),
      },
      {
        name: "Paul Bunyan Muffler Man",
        latitude: 44.8521,
        longitude: -93.2421,
        category: "muffler-men",
        state: "Minnesota",
        city: "St. Paul",
        zipCode: "55101",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-09-03",
        customFields: JSON.stringify({ companion: "Babe the Blue Ox", era: "1950s" }),
      },
      {
        name: "World's Largest Rocking Chair",
        latitude: 38.8183,
        longitude: -90.6906,
        category: "worlds-largest",
        state: "Missouri",
        city: "Fanning",
        zipCode: "63640",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-04-25",
        customFields: JSON.stringify({ height: "42 feet", material: "steel" }),
      },
      {
        name: "Uniroyal Gal Muffler Woman",
        latitude: 33.4484,
        longitude: -112.0740,
        category: "muffler-men",
        state: "Arizona",
        city: "Phoenix",
        zipCode: "85003",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-03-18",
        customFields: JSON.stringify({ gender: "female", brand: "Uniroyal" }),
      },
      {
        name: "World's Largest Catsup Bottle",
        latitude: 38.6270,
        longitude: -90.1994,
        category: "worlds-largest",
        state: "Illinois",
        city: "Collinsville",
        zipCode: "62234",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-10-05",
        customFields: JSON.stringify({ brand: "Brooks", height: "170 feet" }),
      },
      {
        name: "Gemini Giant Muffler Man",
        latitude: 41.1520,
        longitude: -88.1792,
        category: "muffler-men",
        state: "Illinois",
        city: "Wilmington",
        zipCode: "60481",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-02-14",
        customFields: JSON.stringify({ theme: "space", holding: "rocket" }),
      },
      {
        name: "World's Largest Mailbox",
        latitude: 41.2565,
        longitude: -95.9345,
        category: "worlds-largest",
        state: "Nebraska",
        city: "Casey",
        zipCode: "50048",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-01-22",
        customFields: JSON.stringify({ functional: "yes", color: "blue" }),
      },
      {
        name: "World's Largest Peanut",
        latitude: 33.4754,
        longitude: -84.4491,
        category: "worlds-largest",
        state: "Georgia",
        city: "Ashburn",
        zipCode: "31714",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-12-08",
        customFields: JSON.stringify({ type: "monument", material: "concrete" }),
      },
      {
        name: "Chicken Boy Muffler Man",
        latitude: 34.0522,
        longitude: -118.2437,
        category: "muffler-men",
        state: "California",
        city: "Los Angeles",
        zipCode: "90012",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-11-17",
        customFields: JSON.stringify({ head: "chicken", restaurant: "former" }),
      },
      {
        name: "Cadillac Ranch",
        latitude: 35.1872,
        longitude: -101.9871,
        category: "unique-finds",
        state: "Texas",
        city: "Amarillo",
        zipCode: "79124",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-10-22",
        customFields: JSON.stringify({ type: "art installation", cars: "10 Cadillacs" }),
      },
      {
        name: "Mystery Spot",
        latitude: 37.0169,
        longitude: -122.0255,
        category: "unique-finds",
        state: "California",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-09-15",
        customFields: JSON.stringify({ type: "gravitational anomaly", opened: "1939" }),
      },
      {
        name: "Coral Castle",
        latitude: 25.5007,
        longitude: -80.4428,
        category: "unique-finds",
        state: "Florida",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-08-30",
        customFields: JSON.stringify({ material: "coral rock", weight: "1,100 tons" }),
      },
    ];

    mockLocations.forEach((loc) => {
      const id = randomUUID();
      this.locations.set(id, {
        id,
        name: loc.name ?? "",
        latitude: loc.latitude ?? 0,
        longitude: loc.longitude ?? 0,
        category: loc.category ?? "",
        state: loc.state ?? "",
        city: loc.city ?? "",
        zipCode: loc.zipCode ?? "",
        photoUrl: loc.photoUrl ?? "",
        photoId: loc.photoId ?? "",
        taggedDate: loc.taggedDate ?? new Date().toISOString().slice(0, 10),
        description: loc.description ?? "",
        customFields: loc.customFields ?? "{}",
        isBookmarked: loc.isBookmarked ?? "false",
      });
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "manager",
      isLocked: "false",
      failedLoginAttempts: "0",
      lastFailedLogin: null,
      lastPasswordChange: now,
      mustChangePassword: "false",
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = {
      ...user,
      password: hashedPassword,
      lastPasswordChange: new Date().toISOString(),
      mustChangePassword: "false",
      failedLoginAttempts: "0",
      isLocked: "false",
    };
    this.users.set(id, updatedUser);
    return true;
  }

  async recordFailedLogin(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const attempts = parseInt(user.failedLoginAttempts || "0", 10) + 1;
    const isLocked = attempts >= 10; // Increased from 5 to 10 attempts before lockout
    
    const updatedUser = {
      ...user,
      failedLoginAttempts: attempts.toString(),
      lastFailedLogin: new Date().toISOString(),
      isLocked: isLocked ? "true" : "false",
    };
    this.users.set(userId, updatedUser);
    return true;
  }

  async resetFailedLogins(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = {
      ...user,
      failedLoginAttempts: "0",
      lastFailedLogin: null,
    };
    this.users.set(userId, updatedUser);
    return true;
  }

  async lockUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, isLocked: "true" };
    this.users.set(userId, updatedUser);
    return true;
  }

  async unlockUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = {
      ...user,
      isLocked: "false",
      failedLoginAttempts: "0",
      lastFailedLogin: null,
    };
    this.users.set(userId, updatedUser);
    return true;
  }

  async setMustChangePassword(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, mustChangePassword: "true" };
    this.users.set(userId, updatedUser);
    return true;
  }

  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: string): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = randomUUID();
    const location: Location = {
      id,
      name: insertLocation.name ?? "",
      category: insertLocation.category ?? "",
      state: insertLocation.state ?? "",
      city: insertLocation.city ?? "",
      latitude: insertLocation.latitude ?? 0,
      longitude: insertLocation.longitude ?? 0,
      zipCode: insertLocation.zipCode ?? "",
      photoUrl: insertLocation.photoUrl ?? "",
      photoId: insertLocation.photoId ?? "",
      taggedDate: insertLocation.taggedDate ?? new Date().toISOString().slice(0, 10),
      description: insertLocation.description ?? "",
      customFields: insertLocation.customFields ?? "{}",
      isBookmarked: insertLocation.isBookmarked ?? "false",
    };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const updatedLocation = { ...location, ...updates };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: string): Promise<boolean> {
    return this.locations.delete(id);
  }

  async toggleBookmark(id: string): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const isCurrentlyBookmarked = location.isBookmarked === "true";
    const updatedLocation = { ...location, isBookmarked: isCurrentlyBookmarked ? "false" : "true" };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  // Media methods
  async getAllMedia(): Promise<Media[]> {
    return Array.from(this.media.values()).sort((a, b) => {
      // Sort by uploadedAt descending (newest first)
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }

  async getMedia(id: string): Promise<Media | undefined> {
    return this.media.get(id);
  }

  async createMedia(insertMedia: InsertMedia): Promise<Media> {
    const id = randomUUID();
    const mediaItem: Media = {
      id,
      filename: insertMedia.filename,
      originalName: insertMedia.originalName,
      url: insertMedia.url,
      mimeType: insertMedia.mimeType,
      size: insertMedia.size,
      width: insertMedia.width ?? "",
      height: insertMedia.height ?? "",
      alt: insertMedia.alt ?? "",
      caption: insertMedia.caption ?? "",
      data: insertMedia.data ?? "",
      storagePath: insertMedia.storagePath ?? "",
      uploadedAt: new Date().toISOString(),
      uploadedBy: insertMedia.uploadedBy ?? "",
    };
    this.media.set(id, mediaItem);
    return mediaItem;
  }

  async updateMedia(id: string, updates: Partial<InsertMedia>): Promise<Media | undefined> {
    const mediaItem = this.media.get(id);
    if (!mediaItem) return undefined;
    
    const updatedMedia = { ...mediaItem, ...updates };
    this.media.set(id, updatedMedia);
    return updatedMedia;
  }

  async deleteMedia(id: string): Promise<boolean> {
    return this.media.delete(id);
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const setting: Setting = {
      key: insertSetting.key,
      value: insertSetting.value,
      updatedAt: new Date().toISOString(),
      updatedBy: insertSetting.updatedBy ?? "",
    };
    this.settings.set(setting.key, setting);
    return setting;
  }

  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => 
      (a.displayOrder || 0) - (b.displayOrder || 0)
    );
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.slug === slug
    );
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const category: Category = {
      id,
      name: insertCategory.name,
      slug: insertCategory.slug,
      description: insertCategory.description ?? "",
      icon: insertCategory.icon ?? "📍",
      color: insertCategory.color ?? "#f97316",
      displayOrder: insertCategory.displayOrder ?? 0,
      backgroundImageUrl: insertCategory.backgroundImageUrl ?? "",
      overlayColor: insertCategory.overlayColor ?? "#000000",
      overlayOpacity: insertCategory.overlayOpacity ?? "0.5",
      textColor: insertCategory.textColor ?? "#ffffff",
      customIconUrl: insertCategory.customIconUrl ?? "",
      createdAt: now,
      updatedAt: now,
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = {
      ...category,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductByHandle(handle: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find((product) => product.handle === handle);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product = productInputToRow(insertProduct, id);
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = productInputToRow(
      {
        title: updates.title ?? product.title,
        handle: updates.handle ?? product.handle,
        category: updates.category ?? product.category,
        description: updates.description ?? product.description,
        price: updates.price ?? product.price,
        compareAtPrice: updates.compareAtPrice ?? product.compareAtPrice,
        inventory: updates.inventory ?? product.inventory,
        status: updates.status ?? (product.status as "active" | "draft" | "archived"),
        imageUrl: updates.imageUrl ?? product.imageUrl,
        imageUrls: updates.imageUrls ?? product.imageUrls,
        ageRange: updates.ageRange ?? product.ageRange,
        material: updates.material ?? product.material,
        variants: updates.variants ?? product.variants,
        tags: updates.tags ?? product.tags,
        sku: updates.sku ?? product.sku,
        featured: updates.featured ?? product.featured,
        seoTitle: updates.seoTitle ?? product.seoTitle,
        seoDescription: updates.seoDescription ?? product.seoDescription,
        focusKeyword: updates.focusKeyword ?? product.focusKeyword,
      },
      id,
      product
    );
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      id,
      actorUserId: insertLog.actorUserId ?? null,
      actorUsername: insertLog.actorUsername ?? "",
      action: insertLog.action,
      resourceType: insertLog.resourceType,
      resourceId: insertLog.resourceId,
      summary: insertLog.summary,
      metadata: insertLog.metadata ?? "{}",
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }
}

// Database Storage Implementation
export class DbStorage implements IStorage {
  public initialized = false;
  private seeded = false;

  constructor() {
    // Don't initialize here - wait for ensureStorageReady()
    // This allows the database to be set up first
    this.initialized = true; // Mark as ready immediately since DB access is lazy
  }

  async performSeeding() {
    if (this.seeded) return;
    
    try {
      await this.seedDefaultAdmin();
      await this.seedDefaultCategories();
      await this.seedMockLocations();
      this.seeded = true;
    } catch (error) {
      console.error("❌ Storage seeding error:", error);
      throw error;
    }
  }

  // Seed default admin account (only if INIT_ADMIN_USERNAME env var is set)
  private async seedDefaultAdmin() {
    // Note: This is now called from ensureStorageReady() after database is initialized
    // If seeding from environment, it's handled in ensureStorageReady() for consistency
  }

  // Seed default categories
  private async seedDefaultCategories() {
    const existingCategories = await this.getAllCategories();
    if (existingCategories.length > 0) return;

    const defaultCategories: InsertCategory[] = [
      {
        name: "Muffler Men",
        slug: "muffler-men",
        description: "Giant fiberglass figures that once adorned muffler shops and gas stations",
        icon: "🗿",
        color: "#ef4444",
        displayOrder: 1,
      },
      {
        name: "World's Largest",
        slug: "worlds-largest",
        description: "Colossal monuments to American roadside excess",
        icon: "🎪",
        color: "#3b82f6",
        displayOrder: 2,
      },
      {
        name: "Unique Finds",
        slug: "unique-finds",
        description: "Peculiar treasures and oddities that defy categorization",
        icon: "✨",
        color: "#8b5cf6",
        displayOrder: 3,
      },
    ];

    for (const cat of defaultCategories) {
      await this.createCategory(cat);
    }
  }

  // Seed mock locations
  private async seedMockLocations() {
    const existingLocations = await this.getAllLocations();
    if (existingLocations.length > 0) return;

    const mockLocations: InsertLocation[] = [
      {
        name: "Giant Muffler Man - Wilmington",
        latitude: 41.3083,
        longitude: -88.1467,
        category: "muffler-men",
        state: "Illinois",
        city: "Wilmington",
        zipCode: "60481",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-06-15",
        customFields: JSON.stringify({ material: "fiberglass", height: "28 feet" }),
      },
      {
        name: "World's Largest Ball of Twine",
        latitude: 39.2026,
        longitude: -98.4842,
        category: "worlds-largest",
        state: "Kansas",
        city: "Cawker City",
        zipCode: "67430",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-07-20",
        customFields: JSON.stringify({ weight: "17,400 pounds", creator: "Frank Stoeber" }),
      },
      {
        name: "Cowboy Muffler Man",
        latitude: 32.7767,
        longitude: -96.7970,
        category: "muffler-men",
        state: "Texas",
        city: "Dallas",
        zipCode: "75201",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-08-10",
        customFields: JSON.stringify({ style: "western", accessories: "hat and boots" }),
      },
      {
        name: "World's Largest Thermometer",
        latitude: 35.5944,
        longitude: -116.0733,
        category: "worlds-largest",
        state: "California",
        city: "Baker",
        zipCode: "92309",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-05-12",
        customFields: JSON.stringify({ height: "134 feet", location: "Baker" }),
      },
      {
        name: "Paul Bunyan Muffler Man",
        latitude: 44.8521,
        longitude: -93.2421,
        category: "muffler-men",
        state: "Minnesota",
        city: "St. Paul",
        zipCode: "55101",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-09-03",
        customFields: JSON.stringify({ companion: "Babe the Blue Ox", era: "1950s" }),
      },
      {
        name: "World's Largest Rocking Chair",
        latitude: 38.8183,
        longitude: -90.6906,
        category: "worlds-largest",
        state: "Missouri",
        city: "Fanning",
        zipCode: "63640",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-04-25",
        customFields: JSON.stringify({ height: "42 feet", material: "steel" }),
      },
      {
        name: "Uniroyal Gal Muffler Woman",
        latitude: 33.4484,
        longitude: -112.0740,
        category: "muffler-men",
        state: "Arizona",
        city: "Phoenix",
        zipCode: "85003",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-03-18",
        customFields: JSON.stringify({ gender: "female", brand: "Uniroyal" }),
      },
      {
        name: "World's Largest Catsup Bottle",
        latitude: 38.6270,
        longitude: -90.1994,
        category: "worlds-largest",
        state: "Illinois",
        city: "Collinsville",
        zipCode: "62234",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-10-05",
        customFields: JSON.stringify({ brand: "Brooks", height: "170 feet" }),
      },
      {
        name: "Gemini Giant Muffler Man",
        latitude: 41.1520,
        longitude: -88.1792,
        category: "muffler-men",
        state: "Illinois",
        city: "Wilmington",
        zipCode: "60481",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-02-14",
        customFields: JSON.stringify({ theme: "space", holding: "rocket" }),
      },
      {
        name: "World's Largest Mailbox",
        latitude: 41.2565,
        longitude: -95.9345,
        category: "worlds-largest",
        state: "Nebraska",
        city: "Casey",
        zipCode: "50048",
        photoUrl: "",
        photoId: "",
        taggedDate: "2024-01-22",
        customFields: JSON.stringify({ functional: "yes", color: "blue" }),
      },
      {
        name: "World's Largest Peanut",
        latitude: 33.4754,
        longitude: -84.4491,
        category: "worlds-largest",
        state: "Georgia",
        city: "Ashburn",
        zipCode: "31714",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-12-08",
        customFields: JSON.stringify({ type: "monument", material: "concrete" }),
      },
      {
        name: "Chicken Boy Muffler Man",
        latitude: 34.0522,
        longitude: -118.2437,
        category: "muffler-men",
        state: "California",
        city: "Los Angeles",
        zipCode: "90012",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-11-17",
        customFields: JSON.stringify({ head: "chicken", restaurant: "former" }),
      },
      {
        name: "Cadillac Ranch",
        latitude: 35.1872,
        longitude: -101.9871,
        category: "unique-finds",
        state: "Texas",
        city: "Amarillo",
        zipCode: "79124",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-10-22",
        customFields: JSON.stringify({ type: "art installation", cars: "10 Cadillacs" }),
      },
      {
        name: "Mystery Spot",
        latitude: 37.0169,
        longitude: -122.0255,
        category: "unique-finds",
        state: "California",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-09-15",
        customFields: JSON.stringify({ type: "gravitational anomaly", opened: "1939" }),
      },
      {
        name: "Coral Castle",
        latitude: 25.5007,
        longitude: -80.4428,
        category: "unique-finds",
        state: "Florida",
        photoUrl: "",
        photoId: "",
        taggedDate: "2023-08-30",
        customFields: JSON.stringify({ material: "coral rock", weight: "1,100 tons" }),
      },
    ];

    for (const loc of mockLocations) {
      await this.createLocation(loc);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    const result = await db.update(users)
      .set({
        password: hashedPassword,
        lastPasswordChange: now,
        mustChangePassword: "false",
        failedLoginAttempts: "0",
        isLocked: "false",
      })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  async recordFailedLogin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const attempts = parseInt(user.failedLoginAttempts || "0", 10) + 1;
    const isLocked = attempts >= 10; // Increased from 5 to 10 attempts before lockout

    const result = await db.update(users)
      .set({
        failedLoginAttempts: attempts.toString(),
        lastFailedLogin: new Date().toISOString(),
        isLocked: isLocked ? "true" : "false",
      })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  async resetFailedLogins(userId: string): Promise<boolean> {
    const result = await db.update(users)
      .set({
        failedLoginAttempts: "0",
        lastFailedLogin: null,
      })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  async lockUser(userId: string): Promise<boolean> {
    const result = await db.update(users)
      .set({ isLocked: "true" })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  async unlockUser(userId: string): Promise<boolean> {
    const result = await db.update(users)
      .set({
        isLocked: "false",
        failedLoginAttempts: "0",
        lastFailedLogin: null,
      })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  async setMustChangePassword(userId: string): Promise<boolean> {
    const result = await db.update(users)
      .set({ mustChangePassword: "true" })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const result = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
    return result[0];
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const result = await db.insert(locations).values(insertLocation).returning();
    return result[0];
  }

  async updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const result = await db.update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return result[0];
  }

  async deleteLocation(id: string): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }

  async toggleBookmark(id: string): Promise<Location | undefined> {
    const location = await this.getLocation(id);
    if (!location) return undefined;
    
    const isCurrentlyBookmarked = location.isBookmarked === "true";
    const result = await db.update(locations)
      .set({ isBookmarked: isCurrentlyBookmarked ? "false" : "true" })
      .where(eq(locations.id, id))
      .returning();
    return result[0];
  }

  // Media methods
  async getAllMedia(): Promise<Media[]> {
    const result = await db.select().from(media);
    // Sort by uploadedAt descending (newest first)
    return result.sort((a, b) => {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }

  async getMedia(id: string): Promise<Media | undefined> {
    const result = await db.select().from(media).where(eq(media.id, id)).limit(1);
    return result[0];
  }

  async createMedia(insertMedia: InsertMedia): Promise<Media> {
    const result = await db.insert(media).values(insertMedia).returning();
    return result[0];
  }

  async updateMedia(id: string, updates: Partial<InsertMedia>): Promise<Media | undefined> {
    const result = await db.update(media)
      .set(updates)
      .where(eq(media.id, id))
      .returning();
    return result[0];
  }

  async deleteMedia(id: string): Promise<boolean> {
    const result = await db.delete(media).where(eq(media.id, id)).returning();
    return result.length > 0;
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0];
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    // Use INSERT OR REPLACE to update if exists
    const result = await db.insert(settings)
      .values({
        ...insertSetting,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: insertSetting.value,
          updatedBy: insertSetting.updatedBy,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();
    return result[0];
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.displayOrder));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return result[0];
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(insertCategory).returning();
    return result[0];
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async getAllProducts(): Promise<Product[]> {
    const result = await db.select().from(products);
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getProductByHandle(handle: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.handle, handle)).limit(1);
    return result[0];
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const product = productInputToRow(insertProduct, randomUUID());
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;

    const updated = productInputToRow(
      {
        title: updates.title ?? existing.title,
        handle: updates.handle ?? existing.handle,
        category: updates.category ?? existing.category,
        description: updates.description ?? existing.description,
        price: updates.price ?? existing.price,
        compareAtPrice: updates.compareAtPrice ?? existing.compareAtPrice,
        inventory: updates.inventory ?? existing.inventory,
        status: updates.status ?? (existing.status as "active" | "draft" | "archived"),
        imageUrl: updates.imageUrl ?? existing.imageUrl,
        imageUrls: updates.imageUrls ?? existing.imageUrls,
        ageRange: updates.ageRange ?? existing.ageRange,
        material: updates.material ?? existing.material,
        variants: updates.variants ?? existing.variants,
        tags: updates.tags ?? existing.tags,
        sku: updates.sku ?? existing.sku,
        featured: updates.featured ?? existing.featured,
        seoTitle: updates.seoTitle ?? existing.seoTitle,
        seoDescription: updates.seoDescription ?? existing.seoDescription,
        focusKeyword: updates.focusKeyword ?? existing.focusKeyword,
      },
      id,
      existing
    );
    const result = await db.update(products).set(updated).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(insertLog).returning();
    return result[0];
  }
}

export const storage: IStorage = new DbStorage();

// Add a method to wait for initialization if needed
export async function ensureStorageReady(): Promise<void> {
  try {
    console.log("🌱 Seeding default data...");
    await (storage as DbStorage).performSeeding();
    console.log("✅ Default data seeded successfully");
  } catch (error) {
    console.error("❌ Failed to seed default data:", error);
    throw error;
  }

  // Initialize default admin account from environment variables
  const adminUsername = process.env.INIT_ADMIN_USERNAME;
  const adminPassword = process.env.INIT_ADMIN_PASSWORD;
  const shouldResetAdminPassword = process.env.RESET_ADMIN_PASSWORD === "true";

  console.log(`📋 INIT_ADMIN_USERNAME: ${adminUsername ? "✓ Set" : "✗ Not set"}`);
  console.log(`📋 INIT_ADMIN_PASSWORD: ${adminPassword ? "✓ Set" : "✗ Not set"}`);
  console.log(`📋 RESET_ADMIN_PASSWORD: ${shouldResetAdminPassword ? "✓ Enabled" : "✗ Disabled"}`);

  if (adminUsername && adminPassword) {
    try {
      console.log(`🔍 Checking if admin user "${adminUsername}" exists...`);
      const existingAdmin = await storage.getUserByUsername(adminUsername);
      if (!existingAdmin) {
        console.log("🔐 Creating initial admin account from environment variables...");
        const bcrypt = await import("bcrypt");
        const hashedPassword = await bcrypt.default.hash(adminPassword, 10);
        const newUser = await storage.createUser({
          username: adminUsername,
          password: hashedPassword,
          role: "admin",
        });
        console.log(`✅ Initial admin account created successfully with ID: ${newUser.id}`);
      } else if (shouldResetAdminPassword) {
        console.log(`🔐 Resetting admin password from environment variables for "${adminUsername}"...`);
        await storage.updateUserPassword(existingAdmin.id, adminPassword);
        console.log(`✅ Admin password reset and account unlocked for "${adminUsername}"`);
      } else {
        console.log(`ℹ️  Admin account "${adminUsername}" already exists (ID: ${existingAdmin.id}), skipping initialization`);
      }
    } catch (error) {
      console.error("❌ Failed to create initial admin account:", error);
      console.error("Error details:", error instanceof Error ? error.stack : error);
      throw error;
    }
  } else {
    console.log("ℹ️  INIT_ADMIN_USERNAME or INIT_ADMIN_PASSWORD not set, skipping admin creation");
  }
}
