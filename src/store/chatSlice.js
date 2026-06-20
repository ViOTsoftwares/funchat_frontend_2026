import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: "chat",
  partnerId: "",
  partnerName: "",
  isSearching: false,
  messages: [],
  conversationId: ""
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setMode(state, action) {
      state.mode = action.payload;
    },
    setPartnerId(state, action) {
      state.partnerId = action.payload;
    },
    setPartnerName(state, action) {
      state.partnerName = action.payload;
    },
    setIsSearching(state, action) {
      state.isSearching = action.payload;
    },
    resetMessages(state) {
      state.messages = [];
    },
    setMessages(state, action) {
      state.messages = action.payload;
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    setConversationId(state, action) {
      state.conversationId = action.payload;
    },
    clearConversationId(state) {
      state.conversationId = "";
    }
  }
});

export const {
  setMode,
  setPartnerId,
  setPartnerName,
  setIsSearching,
  resetMessages,
  setMessages,
  addMessage,
  setConversationId,
  clearConversationId
} = chatSlice.actions;

export default chatSlice.reducer;
