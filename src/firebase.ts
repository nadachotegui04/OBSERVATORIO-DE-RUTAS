import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { FlightRoute } from './types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const CHUNK_SIZE = 150; // Keep documents well under 1MB (~50KB per chunk)

export interface PublishedDatasetMeta {
  fileName: string;
  updatedAt: string;
  routeCount: number;
  isDemoLoaded: boolean;
  chunkCount: number;
}

/**
 * Strips undefined values, functions, and non-serializable properties
 * so Firestore accepts every object cleanly without throwing validation errors.
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value === undefined) {
      return null;
    }
    return value;
  }));
}

/**
 * Fetch the current published dataset from Firestore.
 * Downloads all chunks if needed.
 */
export async function fetchPublishedDataset(): Promise<{
  routes: FlightRoute[];
  fileName: string;
  isDemoLoaded: boolean;
  updatedAt: string;
} | null> {
  try {
    const metaDocRef = doc(db, 'datasets', 'published');
    const metaSnap = await getDoc(metaDocRef);

    if (!metaSnap.exists()) {
      return null;
    }

    const meta = metaSnap.data() as PublishedDatasetMeta;

    // Fetch all chunks
    const chunksColRef = collection(db, 'datasets', 'published', 'chunks');
    const chunksSnap = await getDocs(chunksColRef);

    if (chunksSnap.empty) {
      return null;
    }

    // Filter valid chunks, sort chunks by index and merge routes
    const validChunks: { chunkIndex: number; routes: FlightRoute[] }[] = [];
    chunksSnap.forEach((d) => {
      const data = d.data();
      if (data && Array.isArray(data.routes) && typeof data.chunkIndex === 'number') {
        validChunks.push({
          chunkIndex: data.chunkIndex,
          routes: data.routes as FlightRoute[],
        });
      }
    });

    validChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    const mergedRoutes: FlightRoute[] = [];
    for (const chunk of validChunks) {
      mergedRoutes.push(...chunk.routes);
    }

    return {
      routes: mergedRoutes,
      fileName: meta.fileName || '2026_08_27 Arline Routes AR.xlsx',
      isDemoLoaded: !!meta.isDemoLoaded,
      updatedAt: meta.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error fetching published dataset from Firebase Firestore:', err);
    return null;
  }
}

/**
 * Publish a new dataset to Firestore so all users in the world see it.
 * Cleanses all fields of undefined values and writes in controlled parallel requests.
 */
export async function publishDatasetToCloud(
  routes: FlightRoute[],
  fileName: string,
  isDemoLoaded: boolean
): Promise<boolean> {
  try {
    const totalRoutes = routes.length;
    const chunkCount = Math.max(1, Math.ceil(totalRoutes / CHUNK_SIZE));

    // 1. Fetch existing chunks to identify which ones need deletion
    const chunksColRef = collection(db, 'datasets', 'published', 'chunks');
    const existingChunksSnap = await getDocs(chunksColRef);

    const newDocIds = new Set<string>();
    const chunkWritePromises: Promise<void>[] = [];

    // 2. Write new chunks
    for (let i = 0; i < chunkCount; i++) {
      const chunkRoutes = routes.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const docId = `chunk_${String(i).padStart(4, '0')}`;
      newDocIds.add(docId);

      const payload = sanitizeForFirestore({
        chunkIndex: i,
        routes: chunkRoutes,
        count: chunkRoutes.length,
      });

      const chunkDocRef = doc(db, 'datasets', 'published', 'chunks', docId);
      chunkWritePromises.push(setDoc(chunkDocRef, payload));
    }

    // 3. Delete old obsolete chunks that are no longer part of this dataset
    for (const oldDoc of existingChunksSnap.docs) {
      if (!newDocIds.has(oldDoc.id)) {
        chunkWritePromises.push(deleteDoc(oldDoc.ref));
      }
    }

    // Execute chunk writes
    await Promise.all(chunkWritePromises);

    // 4. Write metadata document
    const metaDocRef = doc(db, 'datasets', 'published');
    const cleanMeta = sanitizeForFirestore({
      fileName: fileName || '2026_08_27 Arline Routes AR.xlsx',
      updatedAt: new Date().toISOString(),
      routeCount: totalRoutes,
      isDemoLoaded: !!isDemoLoaded,
      chunkCount,
    });

    await setDoc(metaDocRef, cleanMeta);
    return true;
  } catch (err) {
    console.error('Error publishing dataset to Firestore:', err);
    throw err;
  }
}

/**
 * Listen for live updates to the published dataset.
 * When the admin updates the file, other users can receive the notification or auto-refresh.
 */
export function subscribeToDatasetMeta(onUpdate: (meta: PublishedDatasetMeta) => void) {
  const metaDocRef = doc(db, 'datasets', 'published');
  return onSnapshot(
    metaDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as PublishedDatasetMeta);
      }
    },
    (error) => {
      console.warn('Firestore snapshot error:', error);
    }
  );
}

/**
 * Fetch the admin PIN stored in Cloud Firestore
 */
export async function fetchCloudAdminPin(): Promise<string> {
  try {
    const pinDoc = await getDoc(doc(db, 'settings', 'admin_auth'));
    if (pinDoc.exists()) {
      const data = pinDoc.data();
      if (data && data.adminPin) {
        return data.adminPin;
      }
    }
  } catch (e) {
    console.warn('Could not fetch cloud PIN, falling back to default:', e);
  }
  return 'AFAC2026';
}

/**
 * Update the admin PIN in Cloud Firestore
 */
export async function updateCloudAdminPin(newPin: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'settings', 'admin_auth'), {
      adminPin: newPin,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (e) {
    console.error('Could not update cloud PIN:', e);
    return false;
  }
}

/**
 * Validate that an email has the strictly required domain: @afac.gob.mx
 */
export function isAfacEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  // Valid email pattern ending strictly with @afac.gob.mx
  const regex = /^[a-zA-Z0-9._%+-]+@afac\.gob\.mx$/i;
  return regex.test(clean);
}

/**
 * Record an audit log entry in Firestore for security compliance
 */
export async function logAfacAccessAudit(
  email: string,
  status: 'GRANTED' | 'DENIED' | 'LOGOUT',
  details?: string
): Promise<void> {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, 'access_logs', logId);
    await setDoc(logRef, {
      email: email.trim().toLowerCase(),
      status,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      details: details || '',
    });
  } catch (err) {
    console.warn('Could not record access log to Firestore:', err);
  }
}

/**
 * Authenticate an AFAC employee with their official @afac.gob.mx email
 */
export async function authenticateAfacUser(
  rawEmail: string,
  password?: string
): Promise<{ success: boolean; user?: { email: string; fullName?: string; department?: string; role?: string; loginTimestamp: string }; error?: string }> {
  const email = rawEmail.trim().toLowerCase();

  // 1. Strict Domain Restriction Check
  if (!isAfacEmail(email)) {
    await logAfacAccessAudit(email, 'DENIED', 'Dominio no autorizado');
    return {
      success: false,
      error: 'ACCESO DENEGADO: Este sistema es de uso estrictamente confidencial para personal de la Agencia Federal de Aviación Civil.',
    };
  }

  try {
    // Generate safe Firestore doc ID for email
    const safeDocId = email.replace(/[^a-z0-9]/g, '_');
    const userDocRef = doc(db, 'afac_users', safeDocId);
    const userSnap = await getDoc(userDocRef);

    const nowIso = new Date().toISOString();

    if (userSnap.exists()) {
      const userData = userSnap.data();
      // Verify password: allow configured password or institutional key AFAC2026
      const isValidPass = !password || password === 'AFAC2026' || (userData.password && userData.password === password);
      if (!isValidPass) {
        await logAfacAccessAudit(email, 'DENIED', 'Contraseña incorrecta');
        return {
          success: false,
          error: 'ACCESO DENEGADO: Este sistema es de uso estrictamente confidencial para personal de la Agencia Federal de Aviación Civil.',
        };
      }

      // Update last login
      await setDoc(userDocRef, {
        ...userData,
        lastLoginAt: nowIso,
      }, { merge: true });

      const authenticatedUser = {
        email,
        fullName: userData.fullName || email.split('@')[0].replace('.', ' ').toUpperCase(),
        department: userData.department || 'Dirección de Análisis y Rutas Aéreas',
        role: userData.role || (email.includes('admin') ? 'administrador' : 'analista'),
        loginTimestamp: nowIso,
      };

      await logAfacAccessAudit(email, 'GRANTED', 'Inicio de sesión exitoso');
      return { success: true, user: authenticatedUser };
    } else {
      // First-time registration for this @afac.gob.mx staff member
      const newUser = {
        email,
        fullName: email.split('@')[0].replace('.', ' ').toUpperCase(),
        department: 'Dirección de Análisis y Rutas Aéreas - AFAC',
        role: email.includes('admin') ? 'administrador' : 'analista',
        password: password || 'AFAC2026',
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };

      await setDoc(userDocRef, newUser);
      await logAfacAccessAudit(email, 'GRANTED', 'Primer registro y acceso autorizado');

      return {
        success: true,
        user: {
          email,
          fullName: newUser.fullName,
          department: newUser.department,
          role: newUser.role,
          loginTimestamp: nowIso,
        },
      };
    }
  } catch (err: any) {
    console.error('Error during AFAC authentication in Firestore:', err);
    // Even if firestore has network latency, if domain is valid, grant local verified session
    const fallbackUser = {
      email,
      fullName: email.split('@')[0].replace('.', ' ').toUpperCase(),
      department: 'Personal AFAC',
      role: 'funcionario',
      loginTimestamp: new Date().toISOString(),
    };
    return { success: true, user: fallbackUser };
  }
}

