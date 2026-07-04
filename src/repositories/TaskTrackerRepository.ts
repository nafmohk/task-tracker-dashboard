import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { Task, Category, AuditLog, UserProfile, TaskStatus } from '../types';

// Helper to construct simulated email for Firebase Auth
const getSimulatedEmail = (username: string): string => {
  return `${username.toLowerCase().trim()}@tasktracker.local`;
};

export class TaskTrackerRepository {
  private static _isLocalFallback = localStorage.getItem('taskflow_local_mode') === 'true';

  static isLocalMode(): boolean {
    return this._isLocalFallback;
  }

  static setLocalMode(enabled: boolean): void {
    this._isLocalFallback = enabled;
    if (enabled) {
      localStorage.setItem('taskflow_local_mode', 'true');
    } else {
      localStorage.removeItem('taskflow_local_mode');
      localStorage.removeItem('taskflow_local_user');
    }
  }

  // --- Local Storage Helpers ---
  private static getLocalItem<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private static setLocalItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Check if a username is already taken
   */
  static async isUsernameTaken(username: string): Promise<boolean> {
    const usernameClean = username.toLowerCase().trim();

    if (this._isLocalFallback) {
      const usernames = this.getLocalItem<Record<string, string>>('taskflow_usernames', {});
      return !!usernames[usernameClean];
    }

    const docRef = doc(db, 'usernames', usernameClean);
    try {
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `usernames/${usernameClean}`);
    }
  }

  /**
   * User Registration using Full Name, Username, and Password
   */
  static async registerUser(fullName: string, username: string, md5Password: string): Promise<UserProfile> {
    const usernameClean = username.toLowerCase().trim();
    
    // 1. Guard username uniqueness
    const taken = await this.isUsernameTaken(usernameClean);
    if (taken) {
      throw new Error("Username is already taken");
    }

    if (this._isLocalFallback) {
      const uid = `local_user_${Date.now()}`;
      const userProfile: UserProfile = {
        uid,
        username: usernameClean,
        fullName: fullName.trim(),
        createdAt: new Date().toISOString()
      };

      // Save user
      const users = this.getLocalItem<Record<string, UserProfile>>('taskflow_users', {});
      users[uid] = userProfile;
      this.setLocalItem('taskflow_users', users);

      // Save username reservation
      const usernames = this.getLocalItem<Record<string, string>>('taskflow_usernames', {});
      usernames[usernameClean] = uid;
      this.setLocalItem('taskflow_usernames', usernames);

      // Seed default categories
      await this.seedDefaultCategories(uid);

      // Log user in
      this.setLocalItem('taskflow_local_user', userProfile);
      return userProfile;
    }

    // Synthesize email
    const email = getSimulatedEmail(usernameClean);

    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, md5Password);
    const uid = userCredential.user.uid;

    const userProfile: UserProfile = {
      uid,
      username: usernameClean,
      fullName: fullName.trim(),
      createdAt: new Date().toISOString()
    };

    // Firestore Transaction / Batch to save user profile and username reservation
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), userProfile);
      batch.set(doc(db, 'usernames', usernameClean), { uid });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }

    // Seed default categories for this user
    await this.seedDefaultCategories(uid);

    return userProfile;
  }

  /**
   * User Login using Username and Password
   */
  static async loginUser(username: string, md5Password: string): Promise<UserProfile> {
    const usernameClean = username.toLowerCase().trim();

    if (this._isLocalFallback) {
      const usernames = this.getLocalItem<Record<string, string>>('taskflow_usernames', {});
      const uid = usernames[usernameClean];
      if (!uid) {
        throw new Error("Username not found");
      }
      const users = this.getLocalItem<Record<string, UserProfile>>('taskflow_users', {});
      const profile = users[uid];
      if (!profile) {
        throw new Error("User profile not found");
      }
      this.setLocalItem('taskflow_local_user', profile);
      return profile;
    }

    const email = getSimulatedEmail(usernameClean);

    // Sign in via Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, md5Password);
    const uid = userCredential.user.uid;

    // Fetch user profile from Firestore
    try {
      const profileSnap = await getDoc(doc(db, 'users', uid));
      if (!profileSnap.exists()) {
        throw new Error("User profile not found in database.");
      }
      return profileSnap.data() as UserProfile;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  }

  /**
   * Sign in with Google.
   */
  static async signInWithGoogle(): Promise<{ profile: UserProfile | null; firebaseUser: FirebaseUser | null }> {
    if (this._isLocalFallback) {
      // Simulate successful Google login locally with a mock account
      const mockFirebaseUser = {
        uid: 'google_local_user_123',
        displayName: 'Google Demo User',
        email: 'demo@google.com',
        providerId: 'google.com'
      } as any;

      const profileSnap = this.getLocalItem<Record<string, UserProfile>>('taskflow_users', {});
      const profile = profileSnap['google_local_user_123'] || null;

      return { profile, firebaseUser: mockFirebaseUser };
    }

    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    try {
      const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (profileSnap.exists()) {
        return { profile: profileSnap.data() as UserProfile, firebaseUser };
      } else {
        return { profile: null, firebaseUser };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  }

  /**
   * Complete Google Registration with custom username
   */
  static async completeGoogleRegistration(fullName: string, username: string, firebaseUser: FirebaseUser): Promise<UserProfile> {
    const usernameClean = username.toLowerCase().trim();
    
    // Guard username uniqueness
    const taken = await this.isUsernameTaken(usernameClean);
    if (taken) {
      throw new Error("Username is already taken");
    }

    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      username: usernameClean,
      fullName: fullName.trim(),
      createdAt: new Date().toISOString()
    };

    if (this._isLocalFallback) {
      const users = this.getLocalItem<Record<string, UserProfile>>('taskflow_users', {});
      users[firebaseUser.uid] = userProfile;
      this.setLocalItem('taskflow_users', users);

      const usernames = this.getLocalItem<Record<string, string>>('taskflow_usernames', {});
      usernames[usernameClean] = firebaseUser.uid;
      this.setLocalItem('taskflow_usernames', usernames);

      await this.seedDefaultCategories(firebaseUser.uid);
      this.setLocalItem('taskflow_local_user', userProfile);
      return userProfile;
    }

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', firebaseUser.uid), userProfile);
      batch.set(doc(db, 'usernames', usernameClean), { uid: firebaseUser.uid });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }

    await this.seedDefaultCategories(firebaseUser.uid);

    return userProfile;
  }

  /**
   * Sign out the user
   */
  static async logout(): Promise<void> {
    if (this._isLocalFallback) {
      localStorage.removeItem('taskflow_local_user');
      return;
    }
    await signOut(auth);
  }

  /**
   * Monitor auth state and retrieve profile automatically
   */
  static listenToAuthState(onUserLoaded: (profile: UserProfile | null) => void): () => void {
    if (this._isLocalFallback) {
      const localUser = this.getLocalItem<UserProfile | null>('taskflow_local_user', null);
      setTimeout(() => {
        onUserLoaded(localUser);
      }, 50);
      return () => {};
    }

    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileSnap.exists()) {
            onUserLoaded(profileSnap.data() as UserProfile);
          } else {
            onUserLoaded(null);
          }
        } catch (err) {
          console.error("Auth state loading error from users collection:", err);
          onUserLoaded(null);
        }
      } else {
        onUserLoaded(null);
      }
    });
  }

  /**
   * Seed Default Categories for a user
   */
  private static async seedDefaultCategories(userId: string): Promise<void> {
    const defaults = [
      { name: 'Administration', color: '#3B82F6' },
      { name: 'Marketing', color: '#EC4899' },
      { name: 'Development', color: '#10B981' },
      { name: 'Testing', color: '#F59E0B' }
    ];

    if (this._isLocalFallback) {
      const categories = this.getLocalItem<Category[]>('taskflow_categories', []);
      if (categories.length > 0) return;

      const newCategories = [...categories];
      for (const d of defaults) {
        const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const catData: Category = {
          id: categoryId,
          name: d.name,
          color: d.color,
          createdBy: userId,
          createdAt: new Date().toISOString()
        };
        newCategories.push(catData);
      }
      this.setLocalItem('taskflow_categories', newCategories);
      return;
    }

    try {
      const colRef = collection(db, 'categories');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return; // Already has categories seeded globally, do not duplicate!
      }

      const batch = writeBatch(db);
      for (const d of defaults) {
        const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const catRef = doc(db, 'categories', categoryId);
        const catData: Category = {
          id: categoryId,
          name: d.name,
          color: d.color,
          createdBy: userId,
          createdAt: new Date().toISOString()
        };
        batch.set(catRef, catData);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'categories');
    }
  }

  /**
   * Fetch All Custom Categories
   */
  static async fetchCategories(): Promise<Category[]> {
    if (this._isLocalFallback) {
      const categories = this.getLocalItem<Category[]>('taskflow_categories', []);
      if (categories.length === 0) {
        await this.seedDefaultCategories('system');
        return this.getLocalItem<Category[]>('taskflow_categories', []).sort((a, b) => a.name.localeCompare(b.name));
      }
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    const colRef = collection(db, 'categories');
    try {
      const querySnap = await getDocs(query(colRef, orderBy('name', 'asc')));
      let list = querySnap.docs.map(doc => doc.data() as Category);
      if (list.length === 0) {
        await this.seedDefaultCategories('system');
        const secondSnap = await getDocs(query(colRef, orderBy('name', 'asc')));
        list = secondSnap.docs.map(doc => doc.data() as Category);
      }
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'categories');
    }
  }

  /**
   * Create Custom Category
   */
  static async createCategory(name: string, color: string, userId: string): Promise<Category> {
    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const category: Category = {
      id: categoryId,
      name: name.trim(),
      color,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    if (this._isLocalFallback) {
      const categories = this.getLocalItem<Category[]>('taskflow_categories', []);
      categories.push(category);
      this.setLocalItem('taskflow_categories', categories);
      return category;
    }

    try {
      await setDoc(doc(db, 'categories', categoryId), category);
      return category;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${categoryId}`);
    }
  }

  /**
   * Update Custom Category
   */
  static async updateCategory(categoryId: string, name: string, color: string): Promise<void> {
    if (this._isLocalFallback) {
      const categories = this.getLocalItem<Category[]>('taskflow_categories', []);
      const index = categories.findIndex(c => c.id === categoryId);
      if (index !== -1) {
        categories[index].name = name.trim();
        categories[index].color = color;
        this.setLocalItem('taskflow_categories', categories);
      }
      return;
    }

    const docRef = doc(db, 'categories', categoryId);
    try {
      await updateDoc(docRef, {
        name: name.trim(),
        color
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${categoryId}`);
    }
  }

  /**
   * Delete Custom Category
   */
  static async deleteCategory(categoryId: string): Promise<void> {
    if (this._isLocalFallback) {
      const categories = this.getLocalItem<Category[]>('taskflow_categories', []);
      const filtered = categories.filter(c => c.id !== categoryId);
      this.setLocalItem('taskflow_categories', filtered);
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
    }
  }

  /**
   * Fetch All Tasks
   */
  static async fetchTasks(): Promise<Task[]> {
    if (this._isLocalFallback) {
      const tasks = this.getLocalItem<Task[]>('taskflow_tasks', []);
      return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const colRef = collection(db, 'tasks');
    try {
      const querySnap = await getDocs(query(colRef, orderBy('createdAt', 'desc')));
      return querySnap.docs.map(doc => doc.data() as Task);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'tasks');
    }
  }

  /**
   * Create Task
   */
  static async createTask(
    title: string, 
    description: string, 
    categoryName: string, 
    assigneeName: string, 
    startDate: string, 
    endDate: string, 
    status: TaskStatus, 
    user: UserProfile,
    progress?: number
  ): Promise<Task> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    let calculatedProgress = 0;
    if (status === 'Done') {
      calculatedProgress = 100;
    } else if (status === 'In Progress') {
      calculatedProgress = typeof progress === 'number' ? progress : 0;
    }

    const newTask: Task = {
      id: taskId,
      title: title.trim(),
      description: description.trim(),
      category: categoryName,
      assigneeName: assigneeName.trim(),
      startDate,
      endDate,
      status,
      progress: calculatedProgress,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now
    };

    if (this._isLocalFallback) {
      const tasks = this.getLocalItem<Task[]>('taskflow_tasks', []);
      tasks.push(newTask);
      this.setLocalItem('taskflow_tasks', tasks);
    } else {
      try {
        await setDoc(doc(db, 'tasks', taskId), newTask);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tasks/${taskId}`);
      }
    }

    // Write Audit Log
    const changes: Record<string, { old: any; new: any }> = {
      title: { old: '', new: newTask.title },
      description: { old: '', new: newTask.description },
      category: { old: '', new: newTask.category },
      assigneeName: { old: '', new: newTask.assigneeName },
      startDate: { old: '', new: newTask.startDate },
      endDate: { old: '', new: newTask.endDate },
      status: { old: '', new: newTask.status },
      progress: { old: 0, new: newTask.progress }
    };

    await this.writeAuditLog(taskId, newTask.title, 'created', changes, user);

    return newTask;
  }

  /**
   * Update Task and generate detailed audit logs
   */
  static async updateTask(
    updatedTask: Task,
    oldTask: Task,
    user: UserProfile
  ): Promise<void> {
    const now = new Date().toISOString();
    
    let calculatedProgress = updatedTask.progress ?? 0;
    if (updatedTask.status === 'Done') {
      calculatedProgress = 100;
    } else if (updatedTask.status === 'To Do') {
      calculatedProgress = 0;
    }

    const cleanTask = {
      ...updatedTask,
      title: updatedTask.title.trim(),
      description: updatedTask.description.trim(),
      assigneeName: updatedTask.assigneeName.trim(),
      progress: calculatedProgress,
      updatedAt: now
    };

    // Calculate diff for audit log
    const changes: Record<string, { old: any; new: any }> = {};
    const fieldsToCompare: Array<keyof Task> = ['title', 'description', 'category', 'assigneeName', 'startDate', 'endDate', 'status', 'progress'];
    
    let hasChanges = false;
    fieldsToCompare.forEach(field => {
      if (oldTask[field] !== cleanTask[field]) {
        changes[field] = { old: oldTask[field], new: cleanTask[field] };
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      return; // No need to update if nothing changed
    }

    if (this._isLocalFallback) {
      const tasks = this.getLocalItem<Task[]>('taskflow_tasks', []);
      const index = tasks.findIndex(t => t.id === cleanTask.id);
      if (index !== -1) {
        tasks[index] = cleanTask;
        this.setLocalItem('taskflow_tasks', tasks);
      }
    } else {
      try {
        await setDoc(doc(db, 'tasks', cleanTask.id), cleanTask);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${cleanTask.id}`);
      }
    }

    // Write Audit Log
    await this.writeAuditLog(cleanTask.id, cleanTask.title, 'updated', changes, user);
  }

  /**
   * Delete Task
   */
  static async deleteTask(task: Task, user: UserProfile): Promise<void> {
    if (this._isLocalFallback) {
      const tasks = this.getLocalItem<Task[]>('taskflow_tasks', []);
      const filtered = tasks.filter(t => t.id !== task.id);
      this.setLocalItem('taskflow_tasks', filtered);
    } else {
      try {
        await deleteDoc(doc(db, 'tasks', task.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${task.id}`);
      }
    }

    // Write Audit Log
    const changes: Record<string, { old: any; new: any }> = {
      title: { old: task.title, new: '' }
    };
    await this.writeAuditLog(task.id, task.title, 'deleted', changes, user);
  }

  /**
   * Write Audit Log
   */
  private static async writeAuditLog(
    taskId: string, 
    taskTitle: string, 
    changeType: 'created' | 'updated' | 'deleted', 
    changes: Record<string, { old: any; new: any }>, 
    user: UserProfile
  ): Promise<void> {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const log: AuditLog = {
      id: logId,
      taskId,
      taskTitle,
      updatedBy: user.fullName,
      updatedByUsername: user.username,
      changeType,
      changes,
      timestamp: new Date().toISOString()
    };

    if (this._isLocalFallback) {
      const logs = this.getLocalItem<AuditLog[]>('taskflow_logs', []);
      logs.unshift(log);
      this.setLocalItem('taskflow_logs', logs);
    } else {
      try {
        await setDoc(doc(db, 'audit_logs', logId), log);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `audit_logs/${logId}`);
      }
    }
  }

  /**
   * Fetch All Audit Logs sorted by timestamp desc
   */
  static async fetchAuditLogs(): Promise<AuditLog[]> {
    if (this._isLocalFallback) {
      const logs = this.getLocalItem<AuditLog[]>('taskflow_logs', []);
      return logs;
    }

    const colRef = collection(db, 'audit_logs');
    try {
      const querySnap = await getDocs(query(colRef, orderBy('timestamp', 'desc')));
      return querySnap.docs.map(doc => doc.data() as AuditLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'audit_logs');
    }
  }
}
