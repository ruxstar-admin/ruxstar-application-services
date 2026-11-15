import { File } from 'expo-file-system';
import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut, type WriteOptions } from '@/lib/api-client';
import type {
  BatchInput,
  BatchMessage,
  Certificate,
  Child,
  ChildInput,
  ClassRoster,
  CoachingOrder,
  CoachingRules,
  CourseCard,
  CourseDetail,
  CourseFilters,
  CourseInput,
  DemoBody,
  DeskBatch,
  DeskBatchDetail,
  DeskStudent,
  EnrolBody,
  LinkMaterialBody,
  Material,
  MoveClassBody,
  MyOrdersView,
  PlacedOrder,
  StudentRow,
  StudentsFilter,
  TimetableEntry,
  TodayClass,
  VendorCourse,
} from '@/types/coaching';

const id = (value: string) => encodeURIComponent(value);
const UPLOAD_TIMEOUT_MS = 3 * 60_000;

/** `/v1/coaching`: courses, demos, enrolments, classes and children. */
export const CoachingService = {
  rules: (token: string) => apiGet<CoachingRules>('/v1/coaching/rules', token),
  list: (token: string, filters: CourseFilters, cursor?: string) =>
    apiGetPage<CourseCard>('/v1/coaching', token, { ...filters, online: filters.online === undefined ? undefined : String(filters.online), cursor }),
  get: (token: string, courseId: string) => apiGet<CourseDetail>(`/v1/coaching/${id(courseId)}`, token),
  /** A free batch comes back confirmed with no checkout link. */
  enrol: (token: string, batchId: string, body: EnrolBody, options: WriteOptions) =>
    apiPost<PlacedOrder>(`/v1/coaching/batches/${id(batchId)}/enrol`, { ...body, student: { ...body.student } }, token, options),
  /** One demo per student per course. */
  bookDemo: (token: string, courseId: string, body: DemoBody, options: WriteOptions) =>
    apiPost<PlacedOrder>(`/v1/coaching/${id(courseId)}/demo`, { ...body, student: { ...body.student } }, token, options),
  orders: (token: string, view: MyOrdersView, cursor?: string) => apiGetPage<CoachingOrder>('/v1/coaching/orders', token, { view, cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. */
  order: (token: string, orderId: string) => apiGet<CoachingOrder>(`/v1/coaching/orders/${id(orderId)}`, token),
  pay: (token: string, orderId: string, returnTo: string) => apiPost<{ checkoutUrl: string }>(`/v1/coaching/orders/${id(orderId)}/pay`, { returnTo }, token),
  cancel: (token: string, orderId: string, options: WriteOptions) => apiPost<CoachingOrder>(`/v1/coaching/orders/${id(orderId)}/cancel`, undefined, token, options),
  materials: (token: string, orderId: string) => apiGetPage<Material>(`/v1/coaching/orders/${id(orderId)}/materials`, token),
  messages: (token: string, orderId: string) => apiGetPage<BatchMessage>(`/v1/coaching/orders/${id(orderId)}/messages`, token),
  timetable: (token: string, from: string, days: number) => apiGetPage<TimetableEntry>('/v1/coaching/timetable', token, { from, days }),
  certificates: (token: string, cursor?: string) => apiGetPage<Certificate>('/v1/coaching/certificates', token, { cursor }),
  children: (token: string) => apiGetPage<Child>('/v1/coaching/children', token),
  addChild: (token: string, child: ChildInput, options: WriteOptions) => apiPost<Child>('/v1/coaching/children', { ...child }, token, options),
  updateChild: (token: string, childId: string, child: ChildInput) => apiPatch<Child>(`/v1/coaching/children/${id(childId)}`, { ...child }, token),
  removeChild: (token: string, childId: string) => apiDelete<{ done: true }>(`/v1/coaching/children/${id(childId)}`, token),
};

/** `/v1/vendor`: an institute's courses, batches and students. */
export const VendorCoachingService = {
  list: (token: string, businessId: string) => apiGetPage<VendorCourse>(`/v1/vendor/businesses/${id(businessId)}/courses`, token),
  create: (token: string, businessId: string, body: CourseInput, options: WriteOptions) =>
    apiPost<VendorCourse>(`/v1/vendor/businesses/${id(businessId)}/courses`, { ...body }, token, options),
  get: (token: string, courseId: string) => apiGet<VendorCourse>(`/v1/vendor/courses/${id(courseId)}`, token),
  update: (token: string, courseId: string, changes: Partial<CourseInput>) => apiPatch<VendorCourse>(`/v1/vendor/courses/${id(courseId)}`, { ...changes }, token),
  setPhoto: (token: string, courseId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<VendorCourse>(`/v1/vendor/courses/${id(courseId)}/photo`, { data: jpeg, type: 'image/jpeg' }, token, { timeoutMs: UPLOAD_TIMEOUT_MS }),
  publish: (token: string, courseId: string, options: WriteOptions) => apiPost<VendorCourse>(`/v1/vendor/courses/${id(courseId)}/publish`, undefined, token, options),
  /** Drafts only. */
  remove: (token: string, courseId: string) => apiDelete<{ done: true }>(`/v1/vendor/courses/${id(courseId)}`, token),
  addBatch: (token: string, courseId: string, body: BatchInput, options: WriteOptions) =>
    apiPost<VendorCourse>(`/v1/vendor/courses/${id(courseId)}/batches`, { ...body }, token, options),
  updateBatch: (token: string, batchId: string, changes: Partial<BatchInput>) => apiPatch<VendorCourse>(`/v1/vendor/batches/${id(batchId)}`, { ...changes }, token),
  /** Every student is refunded in full and told why. */
  cancelBatch: (token: string, batchId: string, reason: string, options: WriteOptions) =>
    apiPost<VendorCourse>(`/v1/vendor/batches/${id(batchId)}/cancel`, { reason }, token, options),
  /** Only while no one has enrolled. */
  removeBatch: (token: string, batchId: string) => apiDelete<VendorCourse>(`/v1/vendor/batches/${id(batchId)}`, token),
  students: (token: string, courseId: string, filter: StudentsFilter, cursor?: string) =>
    apiGetPage<StudentRow>(`/v1/vendor/courses/${id(courseId)}/students`, token, { ...filter, cursor }),
};

/** `/v1/coaching/desk`: classes, attendance and the batch's students, for the owner and coaches. */
export const TeachService = {
  batches: (token: string, cursor?: string) => apiGetPage<DeskBatch>('/v1/coaching/desk/batches', token, { cursor }),
  today: (token: string) => apiGetPage<TodayClass>('/v1/coaching/desk/today', token),
  batch: (token: string, batchId: string) => apiGet<DeskBatchDetail>(`/v1/coaching/desk/batches/${id(batchId)}`, token),
  roster: (token: string, classId: string) => apiGet<ClassRoster>(`/v1/coaching/desk/classes/${id(classId)}`, token),
  /** Students left out keep what they had. */
  mark: (token: string, classId: string, marks: { orderId: string; present: boolean }[]) =>
    apiPut<ClassRoster>(`/v1/coaching/desk/classes/${id(classId)}/attendance`, token, { marks: marks.map((m) => ({ ...m })) }),
  cancelClass: (token: string, classId: string, reason: string, options: WriteOptions) =>
    apiPost<DeskBatchDetail>(`/v1/coaching/desk/classes/${id(classId)}/cancel`, { reason }, token, options),
  moveClass: (token: string, classId: string, body: MoveClassBody, options: WriteOptions) =>
    apiPost<DeskBatchDetail>(`/v1/coaching/desk/classes/${id(classId)}/move`, { ...body }, token, options),
  addClass: (token: string, batchId: string, startsAt: string, minutes: number, options: WriteOptions) =>
    apiPost<DeskBatchDetail>(`/v1/coaching/desk/batches/${id(batchId)}/classes`, { startsAt, minutes }, token, options),
  messages: (token: string, batchId: string) => apiGetPage<BatchMessage>(`/v1/coaching/desk/batches/${id(batchId)}/messages`, token),
  sendMessage: (token: string, batchId: string, text: string, options: WriteOptions) =>
    apiPost<BatchMessage>(`/v1/coaching/desk/batches/${id(batchId)}/messages`, { text }, token, options),
  materials: (token: string, batchId: string) => apiGetPage<Material>(`/v1/coaching/desk/batches/${id(batchId)}/materials`, token),
  addLink: (token: string, batchId: string, body: LinkMaterialBody, options: WriteOptions) =>
    apiPost<Material>(`/v1/coaching/desk/batches/${id(batchId)}/materials`, { ...body }, token, options),
  /** Reads a picked PDF or photo and sends its bytes; the API checks the type. */
  addFile: async (
    token: string,
    batchId: string,
    file: { uri: string; mimeType?: string | null },
    meta: { title: string; wholeCourse?: boolean },
    options: WriteOptions,
  ) => {
    const data = await new File(file.uri).bytes();
    return apiPostBytes<Material>(
      `/v1/coaching/desk/batches/${id(batchId)}/materials/file`,
      { data, type: file.mimeType || 'application/octet-stream' },
      token,
      {
        query: { title: meta.title, wholeCourse: meta.wholeCourse ? 'true' : undefined },
        timeoutMs: UPLOAD_TIMEOUT_MS,
        headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined,
      },
    );
  },
  removeMaterial: (token: string, materialId: string) => apiDelete<{ done: true }>(`/v1/coaching/desk/materials/${id(materialId)}`, token),
  students: (token: string, batchId: string) => apiGetPage<DeskStudent>(`/v1/coaching/desk/batches/${id(batchId)}/students`, token),
};