import{r as e,j as s,p as r,t as l,T as a,a7 as n,a8 as i,aE as t,q as o,aF as d,aG as c,P as u,aH as x,aI as h,aJ as j,aK as m,aL as p,U as g,$ as f,w as y,aM as v,aN as b,aO as w,aP as C,aQ as S,aR as U,aS as k,a5 as z,aT as E,aU as P,aV as R,aW as W,aX as T,al as A,aY as F}from"./react-vendor-chunk-814f15fe.js";import{S as L}from"./SettingsLayout-chunk-3e9873fe.js";import{d as I}from"../assets/index-c161c383.js";import"./editor-chunk-85777d73.js";import"./data-fetching-chunk-acdfbf86.js";const N=()=>{const[N,q]=e.useState([]),[D,$]=e.useState(!0),[_,M]=e.useState(null),[G,H]=e.useState(!1),[J,K]=e.useState(!1),[O,Q]=e.useState(!1),[V,X]=e.useState(!1),[Y,B]=e.useState(null),[Z,ee]=e.useState(""),[se,re]=e.useState(""),[le,ae]=e.useState(""),[ne,ie]=e.useState("user"),[te,oe]=e.useState(null),[de,ce]=e.useState(null);e.useEffect(()=>{ue()},[]);const ue=async()=>{$(!0),M(null);try{const e=await I.get("/users");q(e.data)}catch(e){console.error("Error fetching users:",e),M("Failed to load users. Please try again later.")}finally{$(!1)}},xe=e=>e?new Date(e).toLocaleString():"Never";return s.jsxs(L,{title:"User Management",description:"Add, edit, and manage user accounts for your application",children:[s.jsxs(r,{mb:4,children:[_&&s.jsx(l,{severity:"error",sx:{mb:2},children:_}),de&&s.jsx(l,{severity:"success",sx:{mb:2},children:de}),s.jsxs(r,{display:"flex",justifyContent:"space-between",alignItems:"center",mb:2,children:[s.jsx(a,{variant:"h6",component:"h2",children:"Users"}),s.jsxs(r,{children:[s.jsx(n,{title:"Refresh users list",children:s.jsx(i,{onClick:ue,sx:{mr:1},children:s.jsx(t,{})})}),s.jsx(o,{variant:"contained",color:"primary",startIcon:s.jsx(d,{}),onClick:()=>{ee(""),re(""),ae(""),ie("user"),oe(null),H(!0)},children:"Add User"})]})]}),s.jsx(c,{component:u,children:s.jsxs(x,{children:[s.jsx(h,{children:s.jsxs(j,{children:[s.jsx(m,{children:"Username"}),s.jsx(m,{children:"Email"}),s.jsx(m,{children:"Role"}),s.jsx(m,{children:"Created"}),s.jsx(m,{children:"Last Login"}),s.jsx(m,{children:"Actions"})]})}),s.jsx(p,{children:D?s.jsx(j,{children:s.jsxs(m,{colSpan:6,align:"center",children:[s.jsx(g,{size:24,sx:{my:2}}),s.jsx(a,{variant:"body2",color:"textSecondary",children:"Loading users..."})]})}):0===N.length?s.jsx(j,{children:s.jsx(m,{colSpan:6,align:"center",children:s.jsx(a,{variant:"body2",color:"textSecondary",children:"No users found"})})}):N.map(e=>s.jsxs(j,{children:[s.jsx(m,{children:e.username}),s.jsx(m,{children:e.email}),s.jsx(m,{children:s.jsx(f,{label:e.role,color:"admin"===e.role?"error":"default",size:"small",icon:"admin"===e.role?s.jsx(y,{}):void 0})}),s.jsx(m,{children:xe(e.created_at)}),s.jsx(m,{children:xe(e.last_login_at)}),s.jsxs(m,{children:[s.jsx(n,{title:"Edit user",children:s.jsx(i,{onClick:()=>(e=>{B(e),ee(e.username),re(e.email),ae(""),ie(e.role),oe(null),K(!0)})(e),size:"small",color:"primary",children:s.jsx(v,{fontSize:"small"})})}),s.jsx(n,{title:"Reset password",children:s.jsx(i,{onClick:()=>(e=>{B(e),ae(""),oe(null),X(!0)})(e),size:"small",color:"secondary",children:s.jsx(b,{fontSize:"small"})})}),s.jsx(n,{title:"Delete user",children:s.jsx(i,{onClick:()=>(e=>{B(e),Q(!0)})(e),size:"small",color:"error",children:s.jsx(w,{fontSize:"small"})})})]})]},e.id))})]})})]}),s.jsxs(C,{open:G,onClose:()=>H(!1),children:[s.jsx(S,{children:"Add New User"}),s.jsxs(U,{children:[s.jsx(k,{sx:{mb:2},children:"Enter the details for the new user. The user will be able to log in with these credentials."}),te&&s.jsx(l,{severity:"error",sx:{mb:2},children:te}),s.jsx(z,{margin:"dense",label:"Username",fullWidth:!0,value:Z,onChange:e=>ee(e.target.value),sx:{mb:2}}),s.jsx(z,{margin:"dense",label:"Email",type:"email",fullWidth:!0,value:se,onChange:e=>re(e.target.value),sx:{mb:2}}),s.jsx(z,{margin:"dense",label:"Password",type:"password",fullWidth:!0,value:le,onChange:e=>ae(e.target.value),sx:{mb:2}}),s.jsxs(E,{fullWidth:!0,margin:"dense",children:[s.jsx(P,{id:"role-select-label",children:"Role"}),s.jsxs(R,{labelId:"role-select-label",value:ne,label:"Role",onChange:e=>ie(e.target.value),children:[s.jsx(W,{value:"user",children:"User"}),s.jsx(W,{value:"admin",children:"Admin"})]})]})]}),s.jsxs(T,{children:[s.jsxs(o,{onClick:()=>H(!1),color:"inherit",children:[s.jsx(A,{fontSize:"small",sx:{mr:1}}),"Cancel"]}),s.jsxs(o,{onClick:async()=>{if(oe(null),Z.trim()&&se.trim()&&le.trim())try{await I.post("/users",{username:Z,email:se,password:le,role:ne}),ce("User created successfully"),H(!1),ue(),setTimeout(()=>ce(null),3e3)}catch(e){console.error("Error creating user:",e),oe(e.response?.data?.message||"Failed to create user")}else oe("All fields are required")},color:"primary",variant:"contained",children:[s.jsx(F,{fontSize:"small",sx:{mr:1}}),"Create User"]})]})]}),s.jsxs(C,{open:J,onClose:()=>K(!1),children:[s.jsx(S,{children:"Edit User"}),s.jsxs(U,{children:[s.jsx(k,{sx:{mb:2},children:"Update user information. Leave the password field empty to keep the current password."}),te&&s.jsx(l,{severity:"error",sx:{mb:2},children:te}),s.jsx(z,{margin:"dense",label:"Username",fullWidth:!0,value:Z,onChange:e=>ee(e.target.value),sx:{mb:2}}),s.jsx(z,{margin:"dense",label:"Email",type:"email",fullWidth:!0,value:se,onChange:e=>re(e.target.value),sx:{mb:2}}),s.jsx(z,{margin:"dense",label:"Password (leave empty to keep current)",type:"password",fullWidth:!0,value:le,onChange:e=>ae(e.target.value),sx:{mb:2}}),s.jsxs(E,{fullWidth:!0,margin:"dense",children:[s.jsx(P,{id:"edit-role-select-label",children:"Role"}),s.jsxs(R,{labelId:"edit-role-select-label",value:ne,label:"Role",onChange:e=>ie(e.target.value),children:[s.jsx(W,{value:"user",children:"User"}),s.jsx(W,{value:"admin",children:"Admin"})]})]})]}),s.jsxs(T,{children:[s.jsxs(o,{onClick:()=>K(!1),color:"inherit",children:[s.jsx(A,{fontSize:"small",sx:{mr:1}}),"Cancel"]}),s.jsxs(o,{onClick:async()=>{if(Y)if(oe(null),Z.trim()&&se.trim())try{const e={username:Z,email:se,role:ne};le.trim()&&(e.password=le),await I.put(`/users/${Y.id}`,e),ce("User updated successfully"),K(!1),ue(),setTimeout(()=>ce(null),3e3)}catch(e){console.error("Error updating user:",e),oe(e.response?.data?.message||"Failed to update user")}else oe("Username and email are required")},color:"primary",variant:"contained",children:[s.jsx(F,{fontSize:"small",sx:{mr:1}}),"Update User"]})]})]}),s.jsxs(C,{open:O,onClose:()=>Q(!1),children:[s.jsx(S,{children:"Delete User"}),s.jsx(U,{children:s.jsxs(k,{children:["Are you sure you want to delete the user ",s.jsx("strong",{children:Y?.username}),"? This action cannot be undone."]})}),s.jsxs(T,{children:[s.jsxs(o,{onClick:()=>Q(!1),color:"inherit",children:[s.jsx(A,{fontSize:"small",sx:{mr:1}}),"Cancel"]}),s.jsxs(o,{onClick:async()=>{if(Y)try{await I.delete(`/users/${Y.id}`),ce("User deleted successfully"),Q(!1),ue(),setTimeout(()=>ce(null),3e3)}catch(e){console.error("Error deleting user:",e),M(e.response?.data?.message||"Failed to delete user")}},color:"error",variant:"contained",children:[s.jsx(w,{fontSize:"small",sx:{mr:1}}),"Delete User"]})]})]}),s.jsxs(C,{open:V,onClose:()=>X(!1),children:[s.jsx(S,{children:"Reset Password"}),s.jsxs(U,{children:[s.jsxs(k,{sx:{mb:2},children:["Enter a new password for user ",s.jsx("strong",{children:Y?.username}),"."]}),te&&s.jsx(l,{severity:"error",sx:{mb:2},children:te}),s.jsx(z,{margin:"dense",label:"New Password",type:"password",fullWidth:!0,value:le,onChange:e=>ae(e.target.value),autoFocus:!0})]}),s.jsxs(T,{children:[s.jsxs(o,{onClick:()=>X(!1),color:"inherit",children:[s.jsx(A,{fontSize:"small",sx:{mr:1}}),"Cancel"]}),s.jsxs(o,{onClick:async()=>{if(Y)if(oe(null),le.trim())try{await I.post(`/users/${Y.id}/reset-password`,{password:le}),ce("Password reset successfully"),X(!1),setTimeout(()=>ce(null),3e3)}catch(e){console.error("Error resetting password:",e),oe(e.response?.data?.message||"Failed to reset password")}else oe("Password is required")},color:"primary",variant:"contained",children:[s.jsx(F,{fontSize:"small",sx:{mr:1}}),"Reset Password"]})]})]})]})};export{N as default};
