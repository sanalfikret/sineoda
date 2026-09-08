import {dbGet} from '../db.js'
export function needsSchoolReview(content: {creator_id?:string|null; program?:string|null}) {
 if(content.program !== 'student_cinema') return false
 if(!content.creator_id)return true
 const creator=dbGet<{student_application_type:string}>('SELECT student_application_type FROM creators WHERE id=?',[content.creator_id])
 return creator?.student_application_type !== 'individual'
}
